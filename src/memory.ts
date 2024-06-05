import assert from 'assert';

export class Memory {
    public HEAP: Buffer;
    public HEAP8: Int8Array;
    public HEAPU8: Uint8Array;
    public HEAP16: Int16Array;
    public HEAPU16: Uint16Array;
    public HEAP32: Int32Array;
    public HEAPU32: Uint32Array;
    public HEAP64: BigInt64Array;
    public HEAPU64: BigUint64Array;
    public HEAPF32: Float32Array;
    public HEAPF64: Float64Array;

    private totalAllocated: number;
    private totalFreed: number;
    private numAllocations: number;
    private numDeallocations: number;
    private peakMemoryUsage: number;
    private freeList: { offset: number; size: number }[];
    private allocatedList: { offset: number; size: number }[];

    constructor(public readonly size: number) {
        this.HEAP = Buffer.alloc(size);
        this.HEAP8 = new Int8Array(this.HEAP.buffer);
        this.HEAPU8 = new Uint8Array(this.HEAP.buffer);
        this.HEAP16 = new Int16Array(this.HEAP.buffer);
        this.HEAPU16 = new Uint16Array(this.HEAP.buffer);
        this.HEAP32 = new Int32Array(this.HEAP.buffer);
        this.HEAPU32 = new Uint32Array(this.HEAP.buffer);
        this.HEAP64 = new BigInt64Array(this.HEAP.buffer);
        this.HEAPU64 = new BigUint64Array(this.HEAP.buffer);
        this.HEAPF32 = new Float32Array(this.HEAP.buffer);
        this.HEAPF64 = new Float64Array(this.HEAP.buffer);

        this.totalAllocated = 0;
        this.totalFreed = 0;
        this.numAllocations = 0;
        this.numDeallocations = 0;
        this.peakMemoryUsage = 0;
        this.allocatedList = [];
        this.freeList = [{ offset: 0, size: size }];
    }

    private align(size: number, alignment: number): number {
        return (size + alignment - 1) & ~(alignment - 1);
    }

    public malloc(size: number): MemoryPointer | null {
        size = this.align(size, 8); // Align to 8 bytes
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.size >= size) {
                const offset = block.offset;
                block.offset += size;
                block.size -= size;
                if (block.size === 0) {
                    this.freeList.splice(i, 1);
                }
                this.totalAllocated += size;
                this.numAllocations++;
                this.updatePeakMemoryUsage();
                this.allocatedList.push({ offset, size });
                return new MemoryPointer(this, offset, size);
            }
        }
        return null; // Out of memory
    }

    public calloc(size: number): MemoryPointer | null {
        const pointer = this.malloc(size);
        if (pointer !== null) {
            // Fill allocated memory with zeros
            for (let i = pointer.offset; i < pointer.offset + size; i++) {
                this.HEAPU8[i] = 0;
            }
        }
        return pointer;
    }

    public free(offset: number, size: number): void {
        size = this.align(size, 8);
        this.freeList.push({ offset, size });
        this.coalesce();
        this.totalFreed += size;
        this.numDeallocations++;
        this.updatePeakMemoryUsage();
        const index = this.allocatedList.findIndex(
            (block) => block.offset === offset && block.size === size,
        );
        if (index !== -1) {
            this.allocatedList.splice(index, 1);
        }
    }

    private coalesce(): void {
        this.freeList.sort((a, b) => a.offset - b.offset);
        for (let i = 0; i < this.freeList.length - 1; i++) {
            const current = this.freeList[i];
            const next = this.freeList[i + 1];
            if (current.offset + current.size === next.offset) {
                current.size += next.size;
                this.freeList.splice(i + 1, 1);
                i--; // Check the merged block again with the next block
            }
        }
    }

    public cmp(ptr1: MemoryPointer, ptr2: MemoryPointer, size: number): number {
        for (let i = 0; i < size; i++) {
            const byte1 = this.HEAPU8[ptr1.offset + i];
            const byte2 = this.HEAPU8[ptr2.offset + i];
            if (byte1 !== byte2) {
                return byte1 - byte2;
            }
        }
        return 0;
    }

    public set(ptr: MemoryPointer, value: number, size: number): void {
        for (let i = 0; i < size; i++) {
            this.HEAPU8[ptr.offset + i] = value;
        }
    }

    public cpy(dest: MemoryPointer, src: MemoryPointer, size: number): void {
        if (dest.offset < src.offset) {
            for (let i = 0; i < size; i++) {
                this.HEAPU8[dest.offset + i] = this.HEAPU8[src.offset + i];
            }
        } else {
            for (let i = size - 1; i >= 0; i--) {
                this.HEAPU8[dest.offset + i] = this.HEAPU8[src.offset + i];
            }
        }
    }

    public move(dest: MemoryPointer, src: MemoryPointer, size: number): void {
        if (dest.offset < src.offset) {
            for (let i = 0; i < size; i++) {
                this.HEAPU8[dest.offset + i] = this.HEAPU8[src.offset + i];
            }
        } else {
            for (let i = size - 1; i >= 0; i--) {
                this.HEAPU8[dest.offset + i] = this.HEAPU8[src.offset + i];
            }
        }
    }

    private getValueUnsafe(
        offset: number,
        TypedArray: any,
        shift: number,
    ): number | bigint {
        return TypedArray[offset >> shift];
    }

    private setValueUnsafe(
        offset: number,
        value: number | bigint,
        TypedArray: any,
        shift: number,
    ): void {
        TypedArray[offset >> shift] = value;
    }

    public readUnsafe(offset: number, type: string): number | bigint {
        switch (type) {
            case 'i8':
            case 'int8':
                return this.getValueUnsafe(offset, this.HEAP8, 0);
            case 'u8':
            case 'uint8':
                return this.getValueUnsafe(offset, this.HEAPU8, 0);
            case 'i16':
            case 'int16':
                return this.getValueUnsafe(offset, this.HEAP16, 1);
            case 'u16':
            case 'uint16':
                return this.getValueUnsafe(offset, this.HEAPU16, 1);
            case 'i32':
            case 'int32':
                return this.getValueUnsafe(offset, this.HEAP32, 2);
            case 'u32':
            case 'uint32':
                return this.getValueUnsafe(offset, this.HEAPU32, 2);
            case 'i64':
            case 'int64':
                return this.getValueUnsafe(offset, this.HEAP64, 3);
            case 'u64':
            case 'uint64':
                return this.getValueUnsafe(offset, this.HEAPU64, 3);
            case 'f32':
            case 'float32':
                return this.getValueUnsafe(offset, this.HEAPF32, 2);
            case 'f64':
            case 'float64':
                return this.getValueUnsafe(offset, this.HEAPF64, 3);
                break;
            case 'ptr':
            case 'pointer':
                return this.getValueUnsafe(offset, this.HEAPU32, 2);
                break;
            default:
                throw new Error('Invalid type:' + type);
        }
    }

    public writeUnsafe(offset: number, value: any, type: string): void {
        switch (type) {
            case 'i8':
            case 'int8':
                this.setValueUnsafe(offset, value, this.HEAP8, 0);
                break;
            case 'u8':
            case 'uint8':
                this.setValueUnsafe(offset, value, this.HEAPU8, 0);
                break;
            case 'i16':
            case 'int16':
                this.setValueUnsafe(offset, value, this.HEAP16, 1);
                break;
            case 'u16':
            case 'uint16':
                this.setValueUnsafe(offset, value, this.HEAPU16, 1);
                break;
            case 'i32':
            case 'int32':
                this.setValueUnsafe(offset, value, this.HEAP32, 2);
                break;
            case 'u32':
            case 'uint32':
                this.setValueUnsafe(offset, value, this.HEAPU32, 2);
                break;
            case 'i64':
            case 'int64':
                this.setValueUnsafe(offset, value, this.HEAP64, 3);
                break;
            case 'u64':
            case 'uint64':
                this.setValueUnsafe(offset, value, this.HEAPU64, 3);
                break;
            case 'f32':
            case 'float32':
                this.setValueUnsafe(offset, value, this.HEAPF32, 2);
                break;
            case 'f64':
            case 'float64':
                this.setValueUnsafe(offset, value, this.HEAPF64, 3);
                break;
            case 'ptr':
            case 'pointer':
                if (value instanceof MemoryPointer) value = value.offset;
                this.setValueUnsafe(offset, value, this.HEAPU32, 2);
                break;
            default:
                throw new Error('Invalid type:' + type);
        }
    }

    public sizeof(typeOrOffset: any): number {
        if (typeof typeOrOffset === 'string') {
            // Get size of a type
            switch (typeOrOffset) {
                case 'i8':
                case 'int8':
                case 'u8':
                case 'uint8':
                    return 1;
                case 'i16':
                case 'int16':
                case 'u16':
                case 'uint16':
                    return 2;
                case 'i32':
                case 'int32':
                case 'u32':
                case 'uint32':
                case 'f32':
                case 'float32':
                    return 4;
                case 'i64':
                case 'int64':
                case 'u64':
                case 'uint64':
                case 'f64':
                case 'float64':
                    return 8;
                case 'ptr':
                case 'pointer':
                    return 4;
                default:
                    throw new Error('Invalid type: ' + typeOrOffset);
            }
        } else if (
            typeof typeOrOffset === 'number' ||
            typeOrOffset instanceof MemoryPointer
        ) {
            if (typeOrOffset instanceof MemoryPointer)
                typeOrOffset = typeOrOffset.offset;
            for (const block of this.allocatedList) {
                if (
                    typeOrOffset >= block.offset &&
                    typeOrOffset < block.offset + block.size
                ) {
                    return block.size - (typeOrOffset - block.offset);
                }
            }
            throw new Error('Offset is not within allocated memory');
        } else {
            throw new Error('Invalid argument type');
        }
    }

    private updatePeakMemoryUsage(): void {
        const currentMemoryUsage = this.totalAllocated - this.totalFreed;
        if (currentMemoryUsage > this.peakMemoryUsage) {
            this.peakMemoryUsage = currentMemoryUsage;
        }
    }

    get totalUsed(): number {
        return this.totalAllocated - this.totalFreed;
    }

    get fragmentationLevel(): number {
        // Calculate fragmentation level based on free list
        const totalFree = this.freeList.reduce(
            (acc, block) => acc + block.size,
            0,
        );
        return totalFree / (this.totalUsed + totalFree);
    }

    get availableMemory(): number {
        return this.size - this.totalUsed;
    }

    public stat(): any {
        return {
            totalAllocated: this.totalAllocated,
            totalFreed: this.totalFreed,
            totalUsed: this.totalAllocated - this.totalFreed,
            fragmentationLevel: this.fragmentationLevel,
            availableMemory:
                this.size - (this.totalAllocated - this.totalFreed),
            numAllocations: this.numAllocations,
            numDeallocations: this.numDeallocations,
            peakMemoryUsage: this.peakMemoryUsage,
        };
    }
}

export class MemoryPointer {
    constructor(
        private memory: Memory,
        public offset: number,
        public size: number,
    ) {}

    public read(offset: number, type: string): number | bigint {
        return this.memory.readUnsafe(this.offset + offset, type);
    }

    public write(offset: number, value: any, type: string): void {
        this.memory.writeUnsafe(this.offset + offset, value, type);
    }

    public realloc(newSize: number): void {
        const newOffset = this.memory.malloc(newSize);
        if (newOffset !== null) {
            this.memory.HEAP.copyWithin(
                newOffset.offset,
                this.offset,
                this.offset + Math.min(this.size, newSize),
            );
        }
        this.memory.free(this.offset, this.size);
        this.offset = newOffset.offset;
        this.size = newSize;
    }

    public free(): void {
        this.memory.free(this.offset, this.size);
    }

    get buffer(): Buffer {
        return this.memory.HEAP.slice(this.offset, this.offset + this.size);
    }
}
