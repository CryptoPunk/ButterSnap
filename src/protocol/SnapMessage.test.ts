import { expect, test } from "bun:test";
import { MessageType, PcmChunkMessage } from "./SnapMessage";

test("PcmChunkMessage deserializes correctly", () => {
  const buffer = new ArrayBuffer(40);
  const view = new DataView(buffer);
  
  // Base Header (26 bytes)
  view.setUint16(0, 2, true); // Type: PcmChunk
  view.setUint16(2, 42, true); // ID: 42
  view.setUint16(4, 0, true); // RefID
  view.setInt32(6, 100, true); // Sent Sec
  view.setInt32(10, 500, true); // Sent Usec
  view.setInt32(14, 200, true); // Received Sec
  view.setInt32(18, 100, true); // Received Usec
  view.setUint32(22, 40, true); // Total Size (Header 26 + Extra 8 + Payload 4 + ...)
  
  // PCM Extension (offsets 26-37)
  view.setInt32(26, 300, true); // Timestamp Sec
  view.setInt32(30, 200, true); // Timestamp Usec
  view.setUint32(34, 2, true); // Payload Size: 2 bytes
  
  // Dummy Payload
  view.setUint8(38, 0xFF);
  view.setUint8(39, 0x00);

  const msg = new PcmChunkMessage(buffer);
  expect(msg.type).toBe(MessageType.PcmChunk);
  expect(msg.id).toBe(42);
  expect(msg.timestamp.sec).toBe(300);
  expect(msg.timestamp.usec).toBe(200);
  expect(msg.payload.byteLength).toBe(2);
});
