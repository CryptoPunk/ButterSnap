import { expect, test } from "bun:test";
import { MessageType, PcmChunkMessage, CodecMessage, ServerSettingsMessage, TimeMessage, HelloMessage } from "./SnapMessage";

test("PcmChunkMessage deserializes correctly", () => {
  const buffer = new ArrayBuffer(42);
  const view = new DataView(buffer);
  
  view.setUint16(0, MessageType.PcmChunk, true);
  view.setUint16(2, 42, true);
  view.setUint32(22, 42, true);
  view.setInt32(26, 300, true);
  view.setInt32(30, 200, true);
  view.setUint32(34, 4, true); // Payload size 4

  const msg = new PcmChunkMessage(buffer);
  expect(msg.type).toBe(MessageType.PcmChunk);
  expect(msg.id).toBe(42);
  expect(msg.timestamp.sec).toBe(300);
  expect(msg.payload.byteLength).toBe(4);
});

test("CodecMessage deserializes correctly", () => {
  const codecName = "pcm";
  const codecSize = codecName.length;
  const payloadSize = 0;
  const buffer = new ArrayBuffer(26 + 4 + codecSize + 4 + payloadSize);
  const view = new DataView(buffer);
  
  view.setUint16(0, MessageType.Codec, true);
  view.setUint32(22, buffer.byteLength, true);
  view.setInt32(26, codecSize, true);
  
  const encoder = new TextEncoder();
  new Uint8Array(buffer).set(encoder.encode(codecName), 30);
  view.setInt32(30 + codecSize, payloadSize, true);

  const msg = new CodecMessage(buffer);
  expect(msg.type).toBe(MessageType.Codec);
  expect(msg.codec).toBe('pcm');
});

test("ServerSettingsMessage deserializes payload", () => {
  const payload = JSON.stringify({ bufferMs: 1000, latency: 10 });
  const encoder = new TextEncoder();
  const encoded = encoder.encode(payload);
  const buffer = new ArrayBuffer(26 + 4 + encoded.length);
  const view = new DataView(buffer);
  
  view.setUint16(0, MessageType.ServerSettings, true);
  view.setUint32(22, buffer.byteLength, true);
  view.setUint32(26, encoded.length, true);
  
  new Uint8Array(buffer).set(encoded, 30);

  const msg = new ServerSettingsMessage(buffer);
  expect(msg.type).toBe(MessageType.ServerSettings);
  expect(msg.json.bufferMs).toBe(1000);
});

test("TimeMessage deserializes correctly", () => {
  const buffer = new ArrayBuffer(26 + 8);
  const view = new DataView(buffer);
  
  view.setUint16(0, MessageType.Time, true);
  view.setUint32(22, buffer.byteLength, true);
  view.setInt32(26, 500, true); // Sec
  view.setInt32(30, 100, true); // Usec

  const msg = new TimeMessage(buffer);
  expect(msg.type).toBe(MessageType.Time);
  expect(msg.latency.sec).toBe(500);
});

test("HelloMessage creates correct header for serialization", () => {
  const options = { mac: '00:00:00:00:00:00', host: 'test' };
  const msg = new HelloMessage(options);
  const buffer = msg.serialize();
  const view = new DataView(buffer);
  
  expect(view.getUint16(0, true)).toBe(MessageType.Hello);
  expect(view.getUint32(22, true)).toBe(buffer.byteLength);
  
  const payloadStr = new TextDecoder().decode(buffer.slice(30));
  expect(JSON.parse(payloadStr).host).toBe('test');
});
