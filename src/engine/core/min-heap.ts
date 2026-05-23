export interface HeapNode<T> {
  readonly item: T;
  readonly priority: number;
}

export class MinHeap<T> {
  private readonly nodes: HeapNode<T>[] = [];

  get size(): number {
    return this.nodes.length;
  }

  get isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  push(item: T, priority: number): void {
    this.nodes.push({ item, priority });
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): HeapNode<T> | undefined {
    const root = this.nodes[0];
    const tail = this.nodes.pop();
    if (!root || !tail) return undefined;
    if (this.nodes.length > 0) {
      this.nodes[0] = tail;
      this.sinkDown(0);
    }
    return root;
  }

  clear(): void {
    this.nodes.length = 0;
  }

  private bubbleUp(index: number): void {
    let childIndex = index;
    while (childIndex > 0) {
      const parentIndex = Math.floor((childIndex - 1) / 2);
      const child = this.nodes[childIndex];
      const parent = this.nodes[parentIndex];
      if (!child || !parent || child.priority >= parent.priority) break;
      this.nodes[parentIndex] = child;
      this.nodes[childIndex] = parent;
      childIndex = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    let parentIndex = index;
    while (true) {
      const leftIndex = parentIndex * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = parentIndex;

      const left = this.nodes[leftIndex];
      const right = this.nodes[rightIndex];
      const smallest = this.nodes[smallestIndex];

      if (left && smallest && left.priority < smallest.priority) {
        smallestIndex = leftIndex;
      }

      const candidate = this.nodes[smallestIndex];
      if (right && candidate && right.priority < candidate.priority) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === parentIndex) return;

      const parent = this.nodes[parentIndex];
      const child = this.nodes[smallestIndex];
      if (!parent || !child) return;
      this.nodes[parentIndex] = child;
      this.nodes[smallestIndex] = parent;
      parentIndex = smallestIndex;
    }
  }
}
