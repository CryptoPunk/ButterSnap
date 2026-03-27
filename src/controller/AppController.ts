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
  private playbackStatus: 'playing' | 'paused' | 'stopped' = 'stopped';
  private currentStreamId: string | null = null;

  constructor() {
    this.view = new AppView({
      onConnect: (url, streamId) => this.handleConnect(url, streamId),
      onDisconnect: () => this.handleDisconnect(),
      onLoadStreams: (url) => this.handleLoadStreams(url),
      onPresetChange: (name) => {
        this.view.loadPreset(name);
        this.saveSettings();
      },
      onShuffle: () => this.handleShuffle(),
      onScaleChange: (scale) => this.saveSettings(),
      onAaToggle: (enabled) => {
        this.view.setAA(enabled);
        this.saveSettings();
      },
    });

    this.loadSettings();
    this.initMediaSession();
  }

  private loadSettings() {
    const saved = localStorage.getItem('buttersync-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.view.setServerUrl(settings.serverUrl || 'http://localhost:1780');
        if (settings.aa !== undefined) this.view.setAA(settings.aa);
        if (settings.scale !== undefined) this.view.setScale(settings.scale);
        // We don't auto-connect, but we prepare the UI.
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }

  private saveSettings() {
    const settings = {
      serverUrl: this.view.getServerUrl(),
      aa: this.view.getAA(),
      scale: this.view.getScale(),
    };
    localStorage.setItem('buttersync-settings', JSON.stringify(settings));
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

    this.currentStreamId = streamId || null;

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
        
        this.controlClient.addEventListener('notification', (e: any) => {
          this.handleNotification(e.detail);
        });

        await this.controlClient.connect();
      }

      this.saveSettings();
      const status = await this.controlClient.getStatus();
      if (status.server && status.server.streams) {
        this.view.updateStreams(status.server.streams);
      }
    } catch (e) {
      console.error('Failed to load streams', e);
    } finally {
      this.view.setLoadStreamsLoading(false);
    }
  }

  private handleNotification(note: any) {
    console.log('Notification received:', note.method, note.params);
    switch (note.method) {
      case 'Stream.OnUpdate':
        if (note.params.id === this.currentStreamId) {
          const stream = note.params.stream;
          if (stream.metadata) this.updateMediaMetadata(stream.metadata);
          if (stream.properties) this.updatePlaybackState(stream.properties.playbackStatus);
        }
        break;
      case 'Stream.OnProperties':
        // Old versions or different events might use this
        if (note.params.id === this.currentStreamId) {
          if (note.params.metadata) this.updateMediaMetadata(note.params.metadata);
          if (note.params.playbackStatus) this.updatePlaybackState(note.params.playbackStatus);
        }
        break;
      case 'Server.OnUpdate':
        this.handleLoadStreams(this.view.getServerUrl());
        break;
    }
  }

  private initMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      if (this.controlClient && this.currentStreamId) {
        this.controlClient.controlStream(this.currentStreamId, 'play');
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (this.controlClient && this.currentStreamId) {
        this.controlClient.controlStream(this.currentStreamId, 'pause');
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (this.controlClient && this.currentStreamId) {
        this.controlClient.controlStream(this.currentStreamId, 'next');
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (this.controlClient && this.currentStreamId) {
        this.controlClient.controlStream(this.currentStreamId, 'previous');
      }
    });
  }

  private updateMediaMetadata(metadata?: any) {
    if (!metadata || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Live Stream',
      artist: metadata.artist?.join(', ') || 'Snapcast',
      album: metadata.album || '',
      artwork: metadata.artUrl ? [{ src: metadata.artUrl }] : []
    });
  }

  private updatePlaybackState(status: 'playing' | 'paused' | 'stopped') {
    this.playbackStatus = status;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : 'paused';
    }

    if (status === 'playing') {
      this.view.resumeLoop();
    } else {
      this.view.stopLoop();
    }
  }

  private handleShuffle() {
    // We could move the presets logic here, but for now just call the view.
    // In a real MVC, the controller would pick a random preset and tell the view to load it.
    // For simplicity, let's keep the random logic in view or here.
  }

  private processAudioChunk(data: any) {
    if (!this.audioContext || !this.analyzer || !this.client) return;

    let buffer: AudioBuffer;
    let serverTime: number;

    if (data.channelData) {
      // Data is already decoded (e.g. from FLAC/Opus WASM)
      const channels = data.channelData.length;
      const samples = data.samples;
      buffer = this.audioContext.createBuffer(channels, samples, this.sampleFormat.rate);
      for (let i = 0; i < channels; i++) {
        buffer.getChannelData(i).set(data.channelData[i]);
      }
      serverTime = data.timestamp.getMilliseconds();
    } else {
      // Data is raw PCM from PcmChunkMessage
      const chunk = data as PcmChunkMessage;
      const rate = this.sampleFormat.rate;
      const channels = this.sampleFormat.channels;
      const frameCount = Math.floor(chunk.payload.byteLength / this.sampleFormat.frameSize());
      if (frameCount === 0) return;

      buffer = this.audioContext.createBuffer(channels, frameCount, rate);
      const evenByteLength = chunk.payload.byteLength - (chunk.payload.byteLength % 2);
      const pcmData = new Int16Array(chunk.payload, 0, evenByteLength / 2);
      
      for (let i = 0; i < frameCount; i++) {
        for (let ch = 0; ch < channels; ch++) {
          buffer.getChannelData(ch)[i] = pcmData[i * channels + ch] / 32768;
        }
      }
      serverTime = chunk.timestamp.getMilliseconds();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyzer);

    const localTimeMs = this.client.getLocalTime(serverTime) + 200;
    const startTime = Math.max(this.audioContext.currentTime, localTimeMs / 1000);

    source.start(startTime);
    this.lastChunkEnd = startTime + buffer.duration;
  }
}
