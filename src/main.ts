import { SnapClient } from './client/SnapClient';
import { PcmChunkMessage, CodecMessage, SampleFormat } from './protocol/SnapMessage';
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import './style.css';

// Global State
let audioContext: AudioContext | null = null;
let visualizer: any = null;
let client: SnapClient | null = null;
let sampleFormat: SampleFormat = new SampleFormat();
let lastChunkEnd = 0;
let analyzer: AnalyserNode | null = null;
let meshScale = 10;
// UI Selection
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const serverInput = document.getElementById('server-url') as HTMLInputElement;
const statusText = document.getElementById('status') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const presetSelector = document.getElementById('preset-selector') as HTMLSelectElement;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;
const scaleSelector = document.getElementById('scale-selector') as HTMLSelectElement;
const aaCheckbox = document.getElementById('aa-checkbox') as HTMLInputElement;
const chunkCounter = document.getElementById('chunk-count') as HTMLElement;

let chunksReceived = 0;

async function start() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    // Base gain node to route audio
    analyzer.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const url = serverInput.value.trim();
  client = new SnapClient(url, audioContext);

  client.addEventListener('stateChange', (e: any) => {
    const state = e.detail;
    statusText.innerText = state;
    statusText.className = `status-${state.toLowerCase()}`;
    connectBtn.innerText = state === 'CONNECTED' ? 'Disconnect' : 'Connect';
  });

  client.addEventListener('codec', (e: any) => {
    const codec = e.detail as CodecMessage;
    // For now we assume PCM 16-bit 48kHz but in a real app we'd parse the codec payload
    console.log('Codec initialized:', codec.codec);
  });

  client.addEventListener('audio', (e: any) => {
    const chunk = e.detail as PcmChunkMessage;
    processAudioChunk(chunk);
    chunksReceived++;
    chunkCounter.innerText = chunksReceived.toString();
  });

  // Initialize Visualizer if needed
  if (!visualizer) {
    const scale = parseFloat(scaleSelector.value);
    let truePixelWidth = canvas.clientWidth * window.devicePixelRatio;
    let truePixelHeight = canvas.clientHeight * window.devicePixelRatio;

    visualizer = butterchurn.createVisualizer(audioContext, canvas,
      {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        pixelRatio: (window.devicePixelRatio || 1),
        textureRatio: scale,
      }
    );

    visualizer.setInternalMeshSize(
      Math.ceil(truePixelWidth / meshScale),
      Math.ceil(truePixelHeight / meshScale)
    );

    // Connect the analyzer to butterchurn
    visualizer.connectAudio(analyzer);

    const presets = butterchurnPresets.getPresets();
    const presetNames = Object.keys(presets);

    // Populate selector
    presetSelector.innerHTML = '';
    presetNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.text = name;
      presetSelector.appendChild(option);
    });

    const loadPreset = (name: string, blend: number = 2.0) => {
      visualizer.loadPreset(presets[name], blend);
      presetSelector.value = name;
    };

    const initialPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
    loadPreset(initialPreset, 0.0);

    const updateVisualizerSize = () => {
      const scale = parseFloat(scaleSelector.value);
      truePixelWidth = canvas.clientWidth * window.devicePixelRatio;
      truePixelHeight = canvas.clientHeight * window.devicePixelRatio;
      visualizer.setRendererSize(canvas.clientWidth, canvas.clientHeight,
        {
          pixelRatio: (window.devicePixelRatio || 1),
          textureRatio: scale,
          meshWidth: Math.ceil(truePixelWidth / meshScale),
          meshHeight: Math.ceil(truePixelHeight / meshScale),
        }

      );
    };

    presetSelector.onchange = () => {
      loadPreset(presetSelector.value, 1.0);
    };

    scaleSelector.onchange = () => {
      updateVisualizerSize();
    };

    shuffleBtn.onclick = () => {
      const randomPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
      loadPreset(randomPreset, 1.5);
    };

    aaCheckbox.onchange = () => {
      visualizer.setOutputAA(aaCheckbox.checked);
    };

    const loop = () => {
      visualizer.render();
      requestAnimationFrame(loop);
    };
    loop();

    // Auto-cycle presets every 20 seconds
    setInterval(() => {
      const nextPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
      loadPreset(nextPreset, 2.7);
    }, 20000);

    // Update resize listener to use local function
    window.onresize = updateVisualizerSize;
  }

  await client.connect();
}

function processAudioChunk(chunk: PcmChunkMessage) {
  if (!audioContext || !analyzer || !client) return;

  const rate = sampleFormat.rate;
  const channels = sampleFormat.channels;
  const bits = sampleFormat.bits;

  const frameCount = Math.floor(chunk.payload.byteLength / sampleFormat.frameSize());
  if (frameCount === 0) return;

  const buffer = audioContext.createBuffer(channels, frameCount, rate);

  // Buffer conversion (standard 16-bit PCM)
  // Ensure we don't have an odd byte length for Int16Array
  const evenByteLength = chunk.payload.byteLength - (chunk.payload.byteLength % 2);
  const pcmData = new Int16Array(chunk.payload, 0, evenByteLength / 2);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < frameCount; i++) {
    left[i] = pcmData[i * 2] / 32768;
    right[i] = pcmData[i * 2 + 1] / 32768;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyzer);

  // Precise scheduling using server timestamp
  const serverTime = chunk.timestamp.getMilliseconds();
  const localTimeMs = client.getLocalTime(serverTime) + 200; // 200ms buffer
  const startTime = Math.max(audioContext.currentTime, localTimeMs / 1000);

  source.start(startTime);
  lastChunkEnd = startTime + buffer.duration;

  // Latency visualization (approximation)
  const latencyDisplay = document.getElementById('latency') as HTMLElement;
  latencyDisplay.innerText = Math.round((startTime - audioContext.currentTime) * 1000).toString();
}

connectBtn.onclick = () => {
  if (client && (statusText.innerText === 'CONNECTED' || statusText.innerText === 'CONNECTING')) {
    client.disconnect();
    statusText.innerText = 'DISCONNECTED';
    statusText.className = 'status-disconnected';
    connectBtn.innerText = 'Connect';
  } else {
    start().catch(console.error);
  }
};

