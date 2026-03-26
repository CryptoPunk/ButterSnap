import { expect, test } from "bun:test";
import { sync } from "./src/index.ts";

test("sync function returns the correct message", async () => {
  const result = await sync("test");
  expect(result).toBe("Syncing: test");
});
