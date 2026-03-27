import { SnapClient } from '../client/SnapClient';
import { SnapControlClient } from '../client/SnapControlClient';
import { AppView } from '../view/AppView';
import { PcmChunkMessage, SampleFormat } from '../protocol/SnapMessage';

export class AppController {
  private view: AppView;
  private client: SnapClient | null = null;
  private controlClient: SnapControlClient | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private sampleFormat: SampleFormat = new SampleFormat();
  private lastChunkEnd = 0;
  private chunksReceivedCount = 0;

  constructor() {
    this.view = new AppView({
      onConnect: (url, streamId) => this.handleConnect(url, streamId),
      onDisconnect: () => this.handleDisconnect(),
      onLoadStreams: (url) => this.handleLoadStreams(url),
      onPresetChange: (name) => this.view.loadPreset(name),
      onShuffle: () => this.handleShuffle(),
      onScaleChange: (scale) => {}, // Logic handled in view resize
      onAaToggle: (enabled) => this.view.setAA(enabled),
    });
  }

  private async handleConnect(url: string, streamId?: string) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.analyzer.connect(this.audioContext.destination);
      this.view.initVisualizer(this.audioContext, this.analyzer);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.client) this.client.disconnect();
    this.client = new SnapClient(url, this.audioContext, streamId);

    this.client.addEventListener('stateChange', (e: any) => {
      this.view.updateStatus(e.detail);
    });

    this.client.addEventListener('audio', (e: any) => {
      this.processAudioChunk(e.detail as PcmChunkMessage);
      this.chunksReceivedCount++;
      const now = this.audioContext?.currentTime || 0;
      const latency = Math.round((this.lastChunkEnd - now) * 1000);
      this.view.updateDebugInfo(this.chunksReceivedCount, latency);
    });

    await this.client.connect();
  }

  private handleDisconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.view.updateStatus('DISCONNECTED');
    }
  }

  private async handleLoadStreams(url: string) {
    if (!url) return;
    try {
      this.view.setLoadStreamsLoading(true);
      if (!this.controlClient || this.controlClient.baseUrl !== url) {
        if (this.controlClient) this.controlClient.disconnect();
        this.controlClient = new SnapControlClient(url);
        await this.controlClient.connect();
      }

      const data = await this.controlClient.sendRequest('Server.GetStatus');
      if (data.server && data.server.streams) {
        this.view.updateStreams(data.server.streams);
      }
    } catch (e) {
      console.error('Failed to load streams', e);
    } finally {
      this.view.setLoadStreamsLoading(false);
    }
  }

  private handleShuffle() {
    // We could move the presets logic here, but for now just call the view.
    // In a real MVC, the controller would pick a random preset and tell the view to load it.
    // For simplicity, let's keep the random logic in view or here.
  }

  private processAudioChunk(chunk: PcmChunkMessage) {
    if (!this.audioContext || !this.analyzer || !this.client) return;

    const rate = this.sampleFormat.rate;
    const channels = this.sampleFormat.channels;
    const frameCount = Math.floor(chunk.payload.byteLength / this.sampleFormat.frameSize());
    if (frameCount === 0) return;

    const buffer = this.audioContext.createBuffer(channels, frameCount, rate);
    const evenByteLength = chunk.payload.byteLength - (chunk.payload.byteLength % 2);
    const pcmData = new Int16Array(chunk.payload, 0, evenByteLength / 2);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
      left[i] = pcmData[i * 2] / 32768;
      right[i] = pcmData[i * 2 + 1] / 32768;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyzer);

    const serverTime = chunk.timestamp.getMilliseconds();
    const localTimeMs = this.client.getLocalTime(serverTime) + 200;
    const startTime = Math.max(this.audioContext.currentTime, localTimeMs / 1000);

    source.start(startTime);
    this.lastChunkEnd = startTime + buffer.duration;
  }
}
