import { expect, test, describe, mock } from "bun:test";
import { MessageType } from "../protocol/SnapMessage";

// Mock WASM Decoders
mock.module("@wasm-audio-decoders/flac", () => ({
  FLACDecoder: class {
    ready = Promise.resolve();
    decode = mock((data: any) => ({ channelData: [new Float32Array(10), new Float32Array(10)], samplesDecoded: 10 }));
    free = mock(() => {});
  }
}));

mock.module("@wasm-audio-decoders/opus-ml", () => ({
  OpusMLDecoder: class {
    ready = Promise.resolve();
    decodeFrame = mock((data: any) => ({ channelData: [new Float32Array(20), new Float32Array(20)], samplesDecoded: 20 }));
    free = mock(() => {});
  }
}));

mock.module("@wasm-audio-decoders/ogg-vorbis", () => ({
  OggVorbisDecoder: class {
    ready = Promise.resolve();
    decode = mock((data: any) => ({ channelData: [new Float32Array(30), new Float32Array(30)], samplesDecoded: 30 }));
    free = mock(() => {});
  }
}));

// Import SnapClient AFTER mocking modules
import { SnapClient } from "./SnapClient";

// Simple WebSocket mock
class MockWebSocket {
  static OPEN = 1;
  onopen: any;
  onmessage: any;
  onclose: any;
  onerror: any;
  readyState = 1; // OPEN
  
  send = mock((data: any) => {});
  close = mock(() => { if (this.onclose) this.onclose(); });

  constructor(public url: string) {
    setTimeout(() => { if (this.onopen) this.onopen(); }, 0);
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe("SnapClient Base", () => {
  test("initializes in DISCONNECTED state", () => {
    const client = new SnapClient("http://localhost:1780");
    // @ts-ignore
    expect(client.state).toBe("DISCONNECTED");
  });

  test("connect() establishes WebSocket and sends Hello", async () => {
    const client = new SnapClient("http://localhost:1780");
    let state: string = "";
    client.addEventListener("stateChange", (e: any) => { state = e.detail; });
    
    await client.connect();
    
    // @ts-ignore
    const ws = client.socket as MockWebSocket;
    expect(ws.url).toBe("ws://localhost:1780/stream");
    expect(state).toBe("CONNECTED");
    
    // Verify hello message sent
    expect(ws.send).toHaveBeenCalled();
    const sentBuffer = ws.send.mock.calls[0][0] as ArrayBuffer;
    const view = new DataView(sentBuffer);
    expect(view.getUint16(0, true)).toBe(MessageType.Hello);
    
    client.disconnect();
  });

  test("uuid generation works", () => {
    const client = new SnapClient("http://localhost:1780");
    // @ts-ignore
    const uuid1 = client.getUuid();
    // @ts-ignore
    const uuid2 = client.getUuid();
    expect(uuid1).toMatch(/^[0-9a-f-]{36}$/);
    expect(uuid1).not.toBe(uuid2);
  });
});

describe("SnapClient Codec Decoding Support", () => {
  test("switches between PCM and FLAC decoding", async () => {
    const client = new SnapClient("http://localhost:1780");
    await client.connect();
    
    let lastAudioData: any = null;
    client.addEventListener("audio", (e: any) => { lastAudioData = e.detail; });
    
    // 1. Send PCM chunk (MessageType.PcmChunk)
    const pcmBuffer = new ArrayBuffer(42);
    const pcmView = new DataView(pcmBuffer);
    pcmView.setUint16(0, MessageType.PcmChunk, true);
    pcmView.setUint32(22, 42, true);
    pcmView.setUint32(34, 4, true); // payload: 4
    
    // @ts-ignore
    await client.handleMessage({ data: pcmBuffer } as MessageEvent);
    expect(lastAudioData.payload).toBeDefined(); // PCM should have payload
    
    // 2. Switch to FLAC (MessageType.Codec)
    const codecName = "flac";
    const codecBuffer = new ArrayBuffer(26 + 4 + codecName.length + 4);
    const codecView = new DataView(codecBuffer);
    codecView.setUint16(0, MessageType.Codec, true);
    codecView.setUint32(22, codecBuffer.byteLength, true);
    codecView.setInt32(26, codecName.length, true);
    new Uint8Array(codecBuffer).set(new TextEncoder().encode(codecName), 30);
    codecView.setInt32(30 + codecName.length, 0, true);
    
    // @ts-ignore
    await client.handleMessage({ data: codecBuffer } as MessageEvent);
    // @ts-ignore
    expect(client.codec).toBe("flac");
    
    // 3. Send FLAC chunk (should be decoded by FLACDecoder)
    // @ts-ignore
    await client.handleMessage({ data: pcmBuffer } as MessageEvent);
    
    expect(lastAudioData.channelData).toBeDefined(); // Decoded data has channelData
    expect(lastAudioData.channelData.length).toBe(2);
    expect(lastAudioData.samples).toBe(10);
    
    client.disconnect();
  });

  test("opus decoding path provides 20 samples per mock", async () => {
    const client = new SnapClient("http://localhost:1780");
    await client.connect();
    
    let lastAudioData: any = null;
    client.addEventListener("audio", (e: any) => { lastAudioData = e.detail; });
    
    const codecName = "opus";
    const codecBuffer = new ArrayBuffer(26 + 4 + codecName.length + 4);
    const codecView = new DataView(codecBuffer);
    codecView.setUint16(0, MessageType.Codec, true);
    codecView.setInt32(26, codecName.length, true);
    new Uint8Array(codecBuffer).set(new TextEncoder().encode(codecName), 30);
    
    // @ts-ignore
    await client.handleMessage({ data: codecBuffer } as MessageEvent);
    
    // Send encoded chunk
    const chunkBuffer = new ArrayBuffer(42);
    new DataView(chunkBuffer).setUint16(0, MessageType.PcmChunk, true);
    // @ts-ignore
    await client.handleMessage({ data: chunkBuffer } as MessageEvent);
    
    expect(lastAudioData.samples).toBe(20);
    client.disconnect();
  });
});
