import { Tv } from './TimeProvider';

export enum MessageType {
  Codec = 1,
  PcmChunk = 2,
  ServerSettings = 3,
  Time = 4,
  Hello = 5,
}

export class SampleFormat {
  rate: number = 48000;
  channels: number = 2;
  bits: number = 16;

  public msRate(): number {
    return this.rate / 1000;
  }

  public toString(): string {
    return `${this.rate}:${this.bits}:${this.channels}`;
  }

  public sampleSize(): number {
    return this.bits === 24 ? 4 : this.bits / 8;
  }

  public frameSize(): number {
    return this.channels * this.sampleSize();
  }

  public durationMs(bytes: number): number {
    return (bytes / this.frameSize()) / this.msRate();
  }
}

export abstract class SnapMessage {
  type: MessageType = MessageType.Codec;
  id: number = 0;
  refersTo: number = 0;
  sent: Tv = new Tv();
  received: Tv = new Tv();
  size: number = 0;

  deserialize(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    this.type = view.getUint16(0, true) as MessageType;
    this.id = view.getUint16(2, true);
    this.refersTo = view.getUint16(4, true);
    // Note: following snapweb's deserialization order
    this.received = new Tv(view.getInt32(6, true), view.getInt32(10, true));
    this.sent = new Tv(view.getInt32(14, true), view.getInt32(18, true));
    this.size = view.getUint32(22, true);
  }

  serializeBase(view: DataView) {
    view.setUint16(0, this.type, true);
    view.setUint16(2, this.id, true);
    view.setUint16(4, this.refersTo, true);
    view.setInt32(6, this.sent.sec, true);
    view.setInt32(10, this.sent.usec, true);
    view.setInt32(14, this.received.sec, true);
    view.setInt32(18, this.received.usec, true);
    view.setUint32(22, this.size, true);
  }

  abstract serialize(): ArrayBuffer;
}

export class TimeMessage extends SnapMessage {
  latency: Tv = new Tv();

  constructor(buffer?: ArrayBuffer) {
    super();
    this.type = MessageType.Time;
    if (buffer) {
      this.deserialize(buffer);
    }
  }

  deserialize(buffer: ArrayBuffer) {
    super.deserialize(buffer);
    const view = new DataView(buffer);
    this.latency = new Tv(view.getInt32(26, true), view.getInt32(30, true));
  }

  serialize(): ArrayBuffer {
    this.size = 26 + 8;
    const buffer = new ArrayBuffer(this.size);
    const view = new DataView(buffer);
    this.serializeBase(view);
    view.setInt32(26, this.latency.sec, true);
    view.setInt32(30, this.latency.usec, true);
    return buffer;
  }
}

export class PcmChunkMessage extends SnapMessage {
  timestamp: Tv = new Tv();
  payload: ArrayBuffer = new ArrayBuffer(0);

  constructor(buffer?: ArrayBuffer) {
    super();
    this.type = MessageType.PcmChunk;
    if (buffer) {
      this.deserialize(buffer);
    }
  }

  deserialize(buffer: ArrayBuffer) {
    super.deserialize(buffer);
    const view = new DataView(buffer);
    this.timestamp = new Tv(view.getInt32(26, true), view.getInt32(30, true));
    this.payload = buffer.slice(38);
  }

  serialize(): ArrayBuffer {
    this.size = 26 + 8 + 4 + this.payload.byteLength;
    const buffer = new ArrayBuffer(this.size);
    const view = new DataView(buffer);
    this.serializeBase(view);
    view.setInt32(26, this.timestamp.sec, true);
    view.setInt32(30, this.timestamp.usec, true);
    view.setUint32(34, this.payload.byteLength, true);
    const payloadUint8 = new Uint8Array(buffer, 38);
    payloadUint8.set(new Uint8Array(this.payload));
    return buffer;
  }
}

export class CodecMessage extends SnapMessage {
  codec: string = "";
  payload: ArrayBuffer = new ArrayBuffer(0);

  constructor(buffer?: ArrayBuffer) {
    super();
    this.type = MessageType.Codec;
    if (buffer) {
      this.deserialize(buffer);
    }
  }

  deserialize(buffer: ArrayBuffer) {
    super.deserialize(buffer);
    const view = new DataView(buffer);
    const codecSize = view.getInt32(26, true);
    const decoder = new TextDecoder("utf-8");
    this.codec = decoder.decode(buffer.slice(30, 30 + codecSize));
    const payloadSize = view.getInt32(30 + codecSize, true);
    this.payload = buffer.slice(34 + codecSize, 34 + codecSize + payloadSize);
  }

  serialize(): ArrayBuffer {
    const encoder = new TextEncoder();
    const codecEncoded = encoder.encode(this.codec);
    this.size = 26 + 4 + codecEncoded.length + 4 + this.payload.byteLength;
    const buffer = new ArrayBuffer(this.size);
    const view = new DataView(buffer);
    this.serializeBase(view);
    view.setInt32(26, codecEncoded.length, true);
    const codecView = new Uint8Array(buffer, 30, codecEncoded.length);
    codecView.set(codecEncoded);
    view.setInt32(30 + codecEncoded.length, this.payload.byteLength, true);
    const payloadView = new Uint8Array(buffer, 34 + codecEncoded.length);
    payloadView.set(new Uint8Array(this.payload));
    return buffer;
  }
}

export class JsonMessage extends SnapMessage {
  json: any;

  constructor(data?: ArrayBuffer | any) {
    super();
    if (data instanceof ArrayBuffer) {
      this.deserialize(data);
    } else if (data) {
      this.json = data;
    }
  }

  deserialize(buffer: ArrayBuffer) {
    super.deserialize(buffer);
    const view = new DataView(buffer);
    const size = view.getUint32(26, true);
    const decoder = new TextDecoder();
    this.json = JSON.parse(decoder.decode(buffer.slice(30, 30 + size)));
  }

  serialize(): ArrayBuffer {
    const jsonStr = JSON.stringify(this.json);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(jsonStr);
    this.size = 26 + 4 + encoded.length;
    const buffer = new ArrayBuffer(this.size);
    const view = new DataView(buffer);
    this.serializeBase(view);
    view.setUint32(26, encoded.length, true);
    const uint8Arr = new Uint8Array(buffer, 30);
    uint8Arr.set(encoded);
    return buffer;
  }
}

export class HelloMessage extends JsonMessage {
  constructor(data?: any) {
    super(data);
    this.type = MessageType.Hello;
  }
}

export class ServerSettingsMessage extends JsonMessage {
  constructor(data?: any) {
    super(data);
    this.type = MessageType.ServerSettings;
  }
}
