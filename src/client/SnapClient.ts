import {
  MessageType,
  HelloMessage,
  TimeMessage,
  PcmChunkMessage,
  CodecMessage,
  ServerSettingsMessage,
  SampleFormat,
  SnapMessage
} from '../protocol/SnapMessage';
import { TimeProvider, Tv } from '../protocol/TimeProvider';
import { FLACDecoder } from '@wasm-audio-decoders/flac';
import { OpusMLDecoder } from '@wasm-audio-decoders/opus-ml';
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis';

export type SnapClientState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export class SnapClient extends EventTarget {
  private socket: WebSocket | null = null;
  private timeProvider: TimeProvider;
  private sampleFormat: SampleFormat = new SampleFormat();
  private state: SnapClientState = 'DISCONNECTED';
  private msgId: number = 0;
  private syncInterval: number | null = null;
  private streamId: string | null = null;
  private decoder: any = null;
  private codec: string = 'pcm';

  constructor(private baseUrl: string, private audioContext?: AudioContext, streamId?: string) {
    super();
    this.timeProvider = new TimeProvider(audioContext);
    this.streamId = streamId || null;
  }

  public async connect(): Promise<void> {
    if (this.state !== 'DISCONNECTED') return;

    this.state = 'CONNECTING';
    this.dispatchEvent(new CustomEvent('stateChange', { detail: this.state }));

    let wsUrl = this.baseUrl.replace(/^http/, 'ws');
    if (wsUrl.endsWith('/')) wsUrl = wsUrl.slice(0, -1);
    wsUrl += '/stream';
    if (this.streamId) {
      wsUrl += `?stream=${encodeURIComponent(this.streamId)}`;
    }

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.handleOpen();
        resolve();
      };
      this.socket.onmessage = (ev) => this.handleMessage(ev);
      this.socket.onclose = () => this.handleClose();
      this.socket.onerror = (ev) => {
        this.handleError(ev);
        reject(ev);
      };
    });
  }

  private handleOpen() {
    this.state = 'CONNECTED';
    this.dispatchEvent(new CustomEvent('stateChange', { detail: this.state }));

    const hello = new HelloMessage();
    hello.json = {
      MAC: '00:00:00:00:00:00',
      HostName: 'ButterSync Client',
      Version: '0.1.0',
      ClientName: 'ButterSync',
      OS: 'web',
      Arch: 'universal',
      Instance: 1,
      ID: this.getUuid(),
      SnapStreamProtocolVersion: 2,
    };

    this.sendMessage(hello);
    this.startSync();
  }

  private async handleMessage(ev: MessageEvent) {
    const buffer = ev.data as ArrayBuffer;
    const view = new DataView(buffer);
    const type = view.getUint16(0, true) as MessageType;

    switch (type) {
      case MessageType.Codec:
        const codecMsg = new CodecMessage(buffer);
        this.codec = codecMsg.codec;
        console.log('Codec received:', this.codec);
        
        // Finalize old decoder
        if (this.decoder) {
          this.decoder.free();
          this.decoder = null;
        }

        if (this.codec === 'flac') {
          this.decoder = new FLACDecoder();
          await this.decoder.ready;
          if (codecMsg.payload.byteLength > 0) {
            await this.decoder.decode(new Uint8Array(codecMsg.payload));
          }
        } else if (this.codec === 'opus') {
          this.decoder = new OpusMLDecoder();
          await this.decoder.ready;
          if (codecMsg.payload.byteLength > 8) {
            const view = new DataView(codecMsg.payload);
            let offset = 0;
            while (offset < codecMsg.payload.byteLength) {
              const packetSize = view.getUint32(offset, true);
              offset += 4;
              if (offset + packetSize > codecMsg.payload.byteLength) break;
              const packet = new Uint8Array(codecMsg.payload, offset, packetSize);
              await this.decoder.decode(packet);
              offset += packetSize;
            }
          }
        } else if (this.codec === 'ogg' || this.codec === 'vorbis') {
          this.decoder = new OggVorbisDecoder();
          await this.decoder.ready;
          if (codecMsg.payload.byteLength > 0) {
            await this.decoder.decode(new Uint8Array(codecMsg.payload));
          }
        }

        this.dispatchEvent(new CustomEvent('codec', { detail: codecMsg }));
        break;

      case MessageType.PcmChunk:
        const pcm = new PcmChunkMessage(buffer);
        if (this.decoder) {
          try {
            const decoded = await this.decoder.decode(new Uint8Array(pcm.payload));
            if (decoded && decoded.channelData) {
              // Emit decoded audio data
              this.dispatchEvent(new CustomEvent('audio', { detail: { 
                timestamp: pcm.timestamp, 
                channelData: decoded.channelData,
                samples: decoded.samplesDecoded
              } }));
            }
          } catch (err) {
            console.error('Decoding error:', err);
          }
        } else {
          // Raw PCM
          this.dispatchEvent(new CustomEvent('audio', { detail: pcm }));
        }
        break;

      case MessageType.Time:
        const time = new TimeMessage(buffer);
        const serverLatency = time.latency.getMilliseconds();
        const roundTrip = this.timeProvider.now() - time.sent.getMilliseconds();
        this.timeProvider.setDiff(serverLatency, roundTrip);
        break;

      case MessageType.ServerSettings:
        const settings = new ServerSettingsMessage(buffer);
        this.dispatchEvent(new CustomEvent('settings', { detail: settings.json }));
        break;
    }
  }

  private handleClose() {
    this.state = 'DISCONNECTED';
    this.stopSync();
    this.dispatchEvent(new CustomEvent('stateChange', { detail: this.state }));
    // Consider auto-reconnect logic here
  }

  private handleError(ev: Event) {
    console.error('WebSocket Error:', ev);
    this.state = 'ERROR';
    this.dispatchEvent(new CustomEvent('stateChange', { detail: this.state }));
  }

  private startSync() {
    this.syncInterval = setInterval(() => {
      const syncMsg = new TimeMessage();
      syncMsg.sent = new Tv();
      syncMsg.sent.setMilliseconds(this.timeProvider.now());
      this.sendMessage(syncMsg);
    }, 1000) as unknown as number;
  }

  private stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private sendMessage(msg: SnapMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      msg.id = ++this.msgId;
      msg.sent = new Tv();
      msg.sent.setMilliseconds(this.timeProvider.now());
      this.socket.send(msg.serialize());
    }
  }

  private getUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public disconnect() {
    this.socket?.close();
  }

  public getServerTime(localTimeMs?: number): number {
    return this.timeProvider.serverTime(localTimeMs || this.timeProvider.now());
  }

  public getLocalTime(serverTimeMs: number): number {
    return this.timeProvider.localTime(serverTimeMs);
  }
}
