import { describe, expect, it } from "vitest";
import { MinHeap } from "@engine/core/min-heap";

describe("MinHeap", () => {
  it("pops nodes in ascending priority order", () => {
    const heap = new MinHeap<string>();
    heap.push("slow", 30);
    heap.push("fast", 5);
    heap.push("middle", 12);

    expect(heap.pop()?.item).toBe("fast");
    expect(heap.pop()?.item).toBe("middle");
    expect(heap.pop()?.item).toBe("slow");
    expect(heap.pop()).toBeUndefined();
  });
});
