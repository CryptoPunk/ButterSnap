import { expect, test, describe, mock } from "bun:test";
import { SnapClient } from "./SnapClient";
import { MessageType } from "../protocol/SnapMessage";

// Simple WebSocket mock
class MockWebSocket {
  static OPEN = 1;
  onopen: any;
  onmessage: any;
  onclose: any;
  onerror: any;
  readyState = 1; // OPEN
  
  // Create mocked send and close
  send = mock((data: any) => {});
  close = mock(() => { if (this.onclose) this.onclose(); });

  constructor(public url: string) {
    // Mimic async connection
    setTimeout(() => { if (this.onopen) this.onopen(); }, 0);
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe("SnapClient", () => {
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

  test("handleMessage dispatches events correctly for PCM chunks", async () => {
    const client = new SnapClient("http://localhost:1780");
    await client.connect();
    
    let audioReceived = false;
    client.addEventListener("audio", () => { audioReceived = true; });
    
    // Simulate incoming PCM chunk
    const buffer = new ArrayBuffer(40);
    const view = new DataView(buffer);
    view.setUint16(0, MessageType.PcmChunk, true);
    view.setUint32(22, 40, true);
    
    // @ts-ignore
    client.handleMessage({ data: buffer } as MessageEvent);
    
    expect(audioReceived).toBe(true);
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
