import { SnapClient } from '../client/SnapClient';
import { SnapControlClient } from '../client/SnapControlClient';
import { IAppView, ViewEvents } from '../view/AppView';
import { PcmChunkMessage, SampleFormat } from '../protocol/SnapMessage';
import { AppExtension } from '../extensions/AppExtension';

export class AppController {
  private view: IAppView;
  public client: SnapClient | null = null;
  public controlClient: SnapControlClient | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private sampleFormat: SampleFormat = new SampleFormat();
  private lastChunkEnd = 0;
  private chunksReceivedCount = 0;
  private playbackStatus: 'playing' | 'paused' | 'stopped' = 'stopped';
  public currentStreamId: string | null = null;
  private playbackShuffle = false;
  private playbackLoop: 'none' | 'track' | 'playlist' = 'none';
  private extensions: AppExtension[] = [];

  constructor(view: IAppView) {
    this.view = view;
    this.loadSettings();
  }

  public registerExtension(extension: AppExtension) {
    this.extensions.push(extension);
    extension.initialize(this);
  }

  private loadSettings() {
    const saved = localStorage.getItem('buttersync-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.view.setServerUrl(settings.serverUrl || 'http://localhost:1780');
        if (settings.aa !== undefined) this.view.setAA(settings.aa);
        if (settings.scale !== undefined) this.view.setScale(settings.scale);
        if (settings.theme !== undefined) this.view.setTheme(settings.theme);
        if (settings.mediaSession !== undefined) this.view.setMediaSessionEnabled(settings.mediaSession);
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
      mediaSession: this.view.getMediaSessionEnabled(),
      theme: document.body.classList.contains('theme-sunset') ? 'theme-sunset' :
        (document.body.classList.contains('theme-forest') ? 'theme-forest' :
          (document.body.classList.contains('theme-midnight') ? 'theme-midnight' : 'theme-neon')),
    };
    localStorage.setItem('buttersync-settings', JSON.stringify(settings));
  }

  public async handleConnect(url: string, streamId?: string) {
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

    // Automatically load streams after connection to populate the selector
    this.handleLoadStreams(url);
  }

  public handleDisconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.view.updateStatus('DISCONNECTED');
    }
  }

  public async handleLoadStreams(url: string) {
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
      if (status.server) {
        if (status.server.streams) {
          this.view.updateStreams(status.server.streams);
        }
        // Extract all clients from all groups
        const allGroups = status.server.groups;
        const allClients = allGroups.flatMap((g: any) => g.clients);
        this.view.updateClients(allClients);

        // Resolve current stream if not set
        if (!this.currentStreamId && this.client) {
          const clientId = this.client.id;
          const group = allGroups.find((g: any) => g.clients.some((c: any) => c.id === clientId));
          if (group) {
            this.currentStreamId = group.stream_id;
            console.log('Resolved currentStreamId for client', clientId, ':', this.currentStreamId);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load status', e);
    } finally {
      this.view.setLoadStreamsLoading(false);
    }
  }

  public handleNotification(note: any) {
    (window as any).lastNote = note;
    console.log('Notification received:', note.method, note.params.id);
    switch (note.method) {
      case 'Stream.OnUpdate':
        if (note.params.id === this.currentStreamId || (!this.currentStreamId && note.params.id)) {
          if (!this.currentStreamId) {
            this.currentStreamId = note.params.id;
            console.log('Auto-setting currentStreamId to', this.currentStreamId);
          }
          const stream = note.params.stream;
          const props = stream.properties || {};
          if (stream.metadata) {
            this.updateMediaMetadata(stream.metadata);
            props.metadata = stream.metadata;
          }
          this.updatePlaybackState(props.playbackStatus || this.playbackStatus, props);
          this.view.updateStreamProperties(props);
        }
        break;
      case 'Stream.OnProperties':
        if (note.params.id === this.currentStreamId || (!this.currentStreamId && note.params.id)) {
          if (!this.currentStreamId) {
            this.currentStreamId = note.params.id;
            console.log('Auto-setting currentStreamId to', this.currentStreamId);
          }
          const props = note.params.properties;
          if (props.metadata) this.updateMediaMetadata(props.metadata, props.position);
          this.updatePlaybackState(props.playbackStatus || this.playbackStatus, props);
          this.view.updateStreamProperties(props);
        }
        break;
      case 'Server.OnUpdate':
        this.handleLoadStreams(this.view.getServerUrl());
        break;
      case 'Client.OnVolumeChanged':
      case 'Client.OnConnect':
      case 'Client.OnDisconnect':
        // Update client list for connection changes
        this.handleLoadStreams(this.view.getServerUrl());
        break;
    }
  }

  public async handleControl(command: 'play' | 'pause' | 'next' | 'previous') {
    if (this.controlClient && this.currentStreamId) {
      try {
        await this.controlClient.controlStream(this.currentStreamId, command);
      } catch (e) {
        console.error(`Failed to send ${command} command`, e);
      }
    } else {
      console.warn(`Cannot send ${command}: controlClient=${!!this.controlClient}, currentStreamId=${this.currentStreamId}`);
    }
  }

  public async handlePlaybackShuffle() {
    if (this.controlClient && this.currentStreamId) {
      try {
        const nextShuffle = !this.playbackShuffle;
        await this.controlClient.setStreamProperty(this.currentStreamId, 'shuffle', nextShuffle);
      } catch (e) {
        console.error('Failed to toggle shuffle', e);
      }
    } else {
      console.warn(`Cannot toggle shuffle: controlClient=${!!this.controlClient}, currentStreamId=${this.currentStreamId}`);
    }
  }

  public async handlePlaybackLoop() {
    if (this.controlClient && this.currentStreamId) {
      try {
        const loopModes: Array<'none' | 'track' | 'playlist'> = ['none', 'playlist', 'track'];
        const currentIdx = loopModes.indexOf(this.playbackLoop);
        const nextLoop = loopModes[(currentIdx + 1) % loopModes.length];
        await this.controlClient.setStreamProperty(this.currentStreamId, 'loopStatus', nextLoop);
      } catch (e) {
        console.error('Failed to toggle loop', e);
      }
    } else {
      console.warn(`Cannot toggle loop: controlClient=${!!this.controlClient}, currentStreamId=${this.currentStreamId}`);
    }
  }

  public async handleVolumeChange(volume: number) {
    if (this.controlClient) {
      // If we have a current client ID, set its volume. 
      // For now, let's assume we are controlling 'this browser' client if we can identify it, 
      // or the first connected client.
      const status = await this.controlClient.getStatus();
      const clientId = status.server.groups[0]?.clients[0]?.id; // Fallback
      if (clientId) {
        await this.controlClient.setClientVolume(clientId, volume);
      }
    }
  }

  public async handleClientChange(clientId: string) {
    // Logic to focus on a different client's volume or state if needed
    console.log('Selected client:', clientId);
  }


  private updateMediaMetadata(metadata?: any, position?: number) {
    if (!metadata) return;

    this.extensions.forEach(ext => ext.onMetadataChange?.(metadata, position));

    this.view.updateMetadata({
      title: metadata.title,
      artist: Array.isArray(metadata.artist) ? metadata.artist.join(', ') : metadata.artist,
      art: metadata.artUrl,
      position: position !== undefined ? position / 1000 : undefined,
      duration: metadata.duration !== undefined ? metadata.duration / 1000 : undefined
    });
  }

  public updatePlaybackState(status: 'playing' | 'paused' | 'stopped', properties?: any) {
    this.playbackStatus = status;

    this.extensions.forEach(ext => ext.onPlaybackStateChange?.(status, properties));

    if (status === 'playing') {
      this.view.resumeLoop();
    } else {
      this.view.stopLoop();
    }

    this.view.setPlaybackStatus(status);

    if (properties) {
      if (properties.position !== undefined && properties.metadata?.duration !== undefined) {
        this.view.updateProgress(properties.position / 1000, properties.metadata.duration / 1000);
      }

      // Update shuffle/loop buttons if present in properties
      if (properties.shuffle !== undefined) {
        this.playbackShuffle = properties.shuffle;
      }
      if (properties.loopStatus !== undefined) {
        this.playbackLoop = properties.loopStatus;
      }

      if (properties.shuffle !== undefined || properties.loopStatus !== undefined) {
        this.view.setPlaybackModes(
          this.playbackShuffle,
          this.playbackLoop
        );
      }
    }
  }

  public handleShuffle() {
    this.view.shuffle();
    this.saveSettings();
  }

  private processAudioChunk(data: any) {
    if (!this.audioContext || !this.analyzer || !this.client) return;

    let buffer: AudioBuffer;
    let serverTime: number;

    if (data.channelData) {
      // Data is already decoded (e.g. from FLAC/Opus WASM)
      const channels = data.channelData.length;
      const samples = data.samples;
      if (channels === 0 || samples === 0) return;

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
