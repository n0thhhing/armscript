/// <reference types="node" />
export declare class Memory {
    readonly size: number;
    HEAP: Buffer;
    HEAP8: Int8Array;
    HEAPU8: Uint8Array;
    HEAP16: Int16Array;
    HEAPU16: Uint16Array;
    HEAP32: Int32Array;
    HEAPU32: Uint32Array;
    HEAP64: BigInt64Array;
    HEAPU64: BigUint64Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;
    private totalAllocated;
    private totalFreed;
    private numAllocations;
    private numDeallocations;
    private peakMemoryUsage;
    private freeList;
    private allocatedList;
    constructor(size: number);
    private align;
    malloc(size: number): MemoryPointer | null;
    calloc(size: number): MemoryPointer | null;
    free(offset: number, size: number): void;
    private coalesce;
    cmp(ptr1: MemoryPointer, ptr2: MemoryPointer, size: number): number;
    set(ptr: MemoryPointer, value: number, size: number): void;
    cpy(dest: MemoryPointer, src: MemoryPointer, size: number): void;
    move(dest: MemoryPointer, src: MemoryPointer, size: number): void;
    private getValueUnsafe;
    private setValueUnsafe;
    readUnsafe(offset: number, type: string): number | bigint;
    writeUnsafe(offset: number, value: any, type: string): void;
    sizeof(typeOrOffset: any): number;
    private updatePeakMemoryUsage;
    get totalUsed(): number;
    get fragmentationLevel(): number;
    get availableMemory(): number;
    stat(): any;
}
export declare class MemoryPointer {
    private memory;
    offset: number;
    size: number;
    constructor(memory: Memory, offset: number, size: number);
    read(offset: number, type: string): number | bigint;
    write(offset: number, value: any, type: string): void;
    realloc(newSize: number): void;
    free(): void;
    get buffer(): Buffer;
}
