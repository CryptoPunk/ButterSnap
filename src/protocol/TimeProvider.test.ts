import { expect, test, describe } from "bun:test";
import { TimeProvider, Tv } from "./TimeProvider";

describe("Tv class", () => {
  test("conversion to and from milliseconds", () => {
    const tv = new Tv(123, 456000); // 123.456s
    expect(tv.getMilliseconds()).toBe(123456);
    
    tv.setMilliseconds(987654.321);
    expect(tv.sec).toBe(987);
    expect(tv.usec).toBe(654321);
  });
});

describe("TimeProvider", () => {
  test("initializes with zero diff", () => {
    const tp = new TimeProvider();
    expect(tp.serverTime(1000)).toBe(1000);
  });

  test("calculates median diff correctly", () => {
    const tp = new TimeProvider();
    // Simulate some sync samples
    // currentDiff = (c2s - s2c) / 2
    tp.setDiff(100, 0); // (100-0)/2 = 50
    tp.setDiff(110, 10); // (110-10)/2 = 50
    tp.setDiff(150, 30); // (150-30)/2 = 60
    
    // Median of [50, 50, 60] is 50
    expect(tp.serverTime(1000)).toBe(1050);
    expect(tp.localTime(1050)).toBe(1000);
  });

  test("uses AudioContext for now() when available", () => {
    const mockCtx = { currentTime: 1.234 };
    const tp = new TimeProvider(mockCtx);
    
    expect(tp.now()).toBe(1234);
  });

  test("serverNow calculates combined time", () => {
    const mockCtx = { currentTime: 2.0 };
    const tp = new TimeProvider(mockCtx);
    tp.setDiff(200, 0); // diff = 100
    
    // now() = 2000ms
    // serverTime = 2000 + 100 = 2100ms
    expect(tp.serverNow()).toBe(2100);
  });
});
