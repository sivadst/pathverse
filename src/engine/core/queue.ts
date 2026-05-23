export class RingQueue<T> {
  private values: Array<T | undefined>;
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(initialCapacity = 1024) {
    this.values = new Array(Math.max(4, initialCapacity));
  }

  get size(): number {
    return this.count;
  }

  enqueue(value: T): void {
    if (this.count === this.values.length) {
      this.grow();
    }
    this.values[this.tail] = value;
    this.tail = (this.tail + 1) % this.values.length;
    this.count += 1;
  }

  dequeue(): T | undefined {
    if (this.count === 0) return undefined;
    const value = this.values[this.head];
    this.values[this.head] = undefined;
    this.head = (this.head + 1) % this.values.length;
    this.count -= 1;
    return value;
  }

  private grow(): void {
    const next = new Array<T | undefined>(this.values.length * 2);
    for (let index = 0; index < this.count; index += 1) {
      next[index] = this.values[(this.head + index) % this.values.length];
    }
    this.values = next;
    this.head = 0;
    this.tail = this.count;
  }
}
