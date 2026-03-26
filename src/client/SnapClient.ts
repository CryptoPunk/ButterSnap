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

export type SnapClientState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export class SnapClient extends EventTarget {
  private socket: WebSocket | null = null;
  private timeProvider: TimeProvider;
  private sampleFormat: SampleFormat = new SampleFormat();
  private state: SnapClientState = 'DISCONNECTED';
  private msgId: number = 0;
  private syncInterval: number | null = null;
  
  constructor(private baseUrl: string, private audioContext?: AudioContext) {
    super();
    this.timeProvider = new TimeProvider(audioContext);
  }

  public async connect(): Promise<void> {
    if (this.state !== 'DISCONNECTED') return;
    
    this.state = 'CONNECTING';
    this.dispatchEvent(new CustomEvent('stateChange', { detail: this.state }));

    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/stream';
    this.socket = new WebSocket(wsUrl);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => this.handleOpen();
    this.socket.onmessage = (ev) => this.handleMessage(ev);
    this.socket.onclose = () => this.handleClose();
    this.socket.onerror = (ev) => this.handleError(ev);
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

  private handleMessage(ev: MessageEvent) {
    const buffer = ev.data as ArrayBuffer;
    const view = new DataView(buffer);
    const type = view.getUint16(0, true) as MessageType;

    switch (type) {
      case MessageType.Codec:
        const codec = new CodecMessage(buffer);
        console.log('Codec received:', codec.codec);
        // In a real implementation, we would initialize a decoder here.
        // For ButterSync, we'll assume PCM if possible or implement a decoder later.
        this.dispatchEvent(new CustomEvent('codec', { detail: codec }));
        break;

      case MessageType.PcmChunk:
        const pcm = new PcmChunkMessage(buffer);
        this.dispatchEvent(new CustomEvent('audio', { detail: pcm }));
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
    this.syncInterval = window.setInterval(() => {
      const syncMsg = new TimeMessage();
      syncMsg.sent = new Tv();
      syncMsg.sent.setMilliseconds(this.timeProvider.now());
      this.sendMessage(syncMsg);
    }, 1000);
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
}
