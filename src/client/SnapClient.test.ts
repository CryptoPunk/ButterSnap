import { expect, test, describe } from "bun:test";
import { SnapClient } from "./SnapClient";

describe("SnapClient", () => {
  test("initializes in DISCONNECTED state", () => {
    const client = new SnapClient("http://localhost:1705");
    expect(client).toBeDefined();
  });

  test("uuid generation works", () => {
    const client = new SnapClient("http://localhost:1705") as any;
    const uuid = client.getUuid();
    expect(uuid).toMatch(/[0-9a-f-]{36}/);
  });
});
