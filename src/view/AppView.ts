import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';

export interface ViewEvents {
  onConnect: (url: string, streamId?: string) => void;
  onDisconnect: () => void;
  onLoadStreams: (url: string) => void;
  onPresetChange: (name: string) => void;
  onShuffle: () => void;
  onScaleChange: (scale: number) => void;
  onAaToggle: (enabled: boolean) => void;
}

export class AppView {
  private connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
  private serverInput = document.getElementById('server-url') as HTMLInputElement;
  private statusText = document.getElementById('status') as HTMLElement;
  private canvas = document.getElementById('canvas') as HTMLCanvasElement;
  private presetSelector = document.getElementById('preset-selector') as HTMLSelectElement;
  private shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;
  private scaleSelector = document.getElementById('scale-selector') as HTMLSelectElement;
  private aaCheckbox = document.getElementById('aa-checkbox') as HTMLInputElement;
  private loadStreamsBtn = document.getElementById('load-streams-btn') as HTMLButtonElement;
  private streamSelector = document.getElementById('stream-selector') as HTMLSelectElement;
  private chunkCounter = document.getElementById('chunk-count') as HTMLElement;
  private latencyDisplay = document.getElementById('latency') as HTMLElement;

  private visualizer: any = null;
  private presets: any = null;

  constructor(private events: ViewEvents) {
    this.initListeners();
    this.presets = butterchurnPresets.getPresets();
    this.populatePresets();
  }

  private initListeners() {
    this.connectBtn.onclick = () => {
      if (this.statusText.innerText === 'CONNECTED' || this.statusText.innerText === 'CONNECTING') {
        this.events.onDisconnect();
      } else {
        this.events.onConnect(this.serverInput.value.trim(), this.streamSelector.value);
      }
    };

    this.loadStreamsBtn.onclick = () => {
      this.events.onLoadStreams(this.serverInput.value.trim());
    };

    this.presetSelector.onchange = () => {
      this.events.onPresetChange(this.presetSelector.value);
    };

    this.shuffleBtn.onclick = () => {
      this.events.onShuffle();
    };

    this.scaleSelector.onchange = () => {
      this.events.onScaleChange(parseFloat(this.scaleSelector.value));
    };

    this.aaCheckbox.onchange = () => {
      this.events.onAaToggle(this.aaCheckbox.checked);
    };

    window.onresize = () => this.resizeVisualizer();
  }

  public initVisualizer(audioContext: AudioContext, analyzer: AnalyserNode) {
    const scale = parseFloat(this.scaleSelector.value);
    this.visualizer = butterchurn.createVisualizer(audioContext, this.canvas, {
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
      pixelRatio: (window.devicePixelRatio * 2) || 1,
      textureRatio: scale,
    });

    this.visualizer.connectAudio(analyzer);

    const presetNames = Object.keys(this.presets);
    const initial = presetNames[Math.floor(Math.random() * presetNames.length)];
    this.loadPreset(initial, 0);

    this.loadDefaultTextures();
    this.startLoop();
  }

  private loadDefaultTextures() {
    if (!this.visualizer) return;
    this.visualizer.loadExtraImages({
      'texture1': '/textures/texture1.png',
      'texture2': '/textures/texture2.png',
    });
  }

  private loopActive = false;
  private startLoop() {
    if (this.loopActive) return;
    this.loopActive = true;
    const loop = () => {
      if (!this.loopActive) return;
      if (this.visualizer) {
        this.visualizer.render();
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  public stopLoop() {
    this.loopActive = false;
  }

  public resumeLoop() {
    if (this.visualizer) {
      this.startLoop();
    }
  }

  public loadPreset(name: string, blend = 2.0) {
    if (this.visualizer && this.presets[name]) {
      this.visualizer.loadPreset(this.presets[name], blend);
      this.presetSelector.value = name;
    }
  }

  public loadExtraImages(imageMap: { [key: string]: string }) {
    if (this.visualizer) {
      this.visualizer.loadExtraImages(imageMap);
    }
  }

  private populatePresets() {
    const names = Object.keys(this.presets);
    this.presetSelector.innerHTML = '';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.text = name;
      this.presetSelector.appendChild(opt);
    });
  }

  private resizeVisualizer() {
    if (!this.visualizer) return;
    let scale = parseFloat(this.scaleSelector.value);
    let trueWidth = this.canvas.clientWidth * window.devicePixelRatio;
    let trueHeight = this.canvas.clientHeight * window.devicePixelRatio;
    let meshScale = 10; // Copied from main.ts
    console.log("trueWidth", trueWidth, "trueHeight", trueHeight, "scale", scale, "pixelRatio", window.devicePixelRatio);
    this.visualizer.setRendererSize(this.canvas.clientWidth, this.canvas.clientHeight, {
      pixelRatio: (window.devicePixelRatio * 2) || 1,
      textureRatio: scale,
      meshWidth: Math.ceil(trueWidth / meshScale),
      meshHeight: Math.ceil(trueHeight / meshScale),
    });
  }

  public updateStatus(state: string) {
    this.statusText.innerText = state;
    this.statusText.className = `status-${state.toLowerCase()}`;
    this.connectBtn.innerText = (state === 'CONNECTED' || state === 'CONNECTING') ? 'Disconnect' : 'Connect';
  }

  public updateStreams(streams: any[]) {
    this.streamSelector.innerHTML = '<option value="">Default Stream</option>';
    streams.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.text = s.uri ? (s.uri.query?.name || s.id) : s.id;
      this.streamSelector.appendChild(opt);
    });
  }

  public setLoadStreamsLoading(loading: boolean) {
    this.loadStreamsBtn.disabled = loading;
    this.loadStreamsBtn.innerText = loading ? '...' : 'List';
  }

  public updateDebugInfo(chunks: number, latency: number) {
    this.chunkCounter.innerText = chunks.toString();
    this.latencyDisplay.innerText = latency.toString();
  }

  public setAA(enabled: boolean) {
    if (this.visualizer) {
      this.visualizer.setOutputAA(enabled);
    }
    this.aaCheckbox.checked = enabled;
  }

  public getAA(): boolean {
    return this.aaCheckbox.checked;
  }

  public setScale(scale: number) {
    this.scaleSelector.value = scale.toString();
    this.resizeVisualizer();
  }

  public getScale(): number {
    return parseFloat(this.scaleSelector.value);
  }

  public setServerUrl(url: string) {
    this.serverInput.value = url;
  }

  public getServerUrl(): string {
    return this.serverInput.value.trim();
  }
}
