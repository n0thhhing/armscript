import { expect, test, describe } from 'bun:test';

import { Memory } from '../src/memory';

test('Calloc', () => {
    const memory = new Memory(1024);

    // Test calloc with exact size
    const pointer1 = memory.calloc(64);
    expect(pointer1).not.toBeNull();
    if (pointer1) {
        expect(pointer1.size).toBe(64);
        // Check if memory is initialized to zero
        for (
            let i = pointer1.offset;
            i < pointer1.offset + pointer1.size;
            i++
        ) {
            expect(memory.HEAPU8[i]).toBe(0);
        }
    }

    // Test calloc with larger size
    const pointer2 = memory.calloc(128);
    expect(pointer2).not.toBeNull();
    if (pointer2) {
        expect(pointer2.size).toBe(128);
        // Check if memory is initialized to zero
        for (
            let i = pointer2.offset;
            i < pointer2.offset + pointer2.size;
            i++
        ) {
            expect(memory.HEAPU8[i]).toBe(0);
        }
    }

    // Test calloc with size larger than available memory
    const pointer3 = memory.calloc(1025);
    expect(pointer3).toBeNull();
});

test('Malloc', () => {
    const memory = new Memory(1024);

    // Test malloc with exact size
    const pointer1 = memory.malloc(64);
    expect(pointer1).not.toBeNull();
    if (pointer1) {
        expect(pointer1.size).toBe(64);
    }

    // Test malloc with larger size
    const pointer2 = memory.malloc(128);
    expect(pointer2).not.toBeNull();
    if (pointer2) {
        expect(pointer2.size).toBe(128);
    }

    // Test malloc with size larger than available memory
    const pointer3 = memory.malloc(1025);
    expect(pointer3).toBeNull();
});

test('Free', () => {
    const memory = new Memory(1024);
    const pointer1 = memory.malloc(64);
    expect(pointer1).not.toBeNull();

    // Test free
    memory.free(pointer1!.offset, pointer1!.size);
    const pointer2 = memory.malloc(64);
    expect(pointer2).not.toBeNull();
    if (pointer2) {
        expect(pointer2.offset).toBe(pointer1!.offset);
    }
});

test('Free Prototype', () => {
    const memory = new Memory(1024);
    const pointer1 = memory.malloc(64);
    expect(pointer1).not.toBeNull();

    pointer1!.free();
    const pointer2 = memory.malloc(64);
    expect(pointer2).not.toBeNull();
    if (pointer2) {
        expect(pointer2.offset).toBe(pointer1!.offset);
    }
});

describe('Read and Write', () => {
    test('Int8', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(1);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 42, 'int8');
            expect(pointer.read(0, 'int8')).toBe(42);
        }
    });

    test('Uint8', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(1);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 100, 'uint8');
            expect(pointer.read(0, 'uint8')).toBe(100);
        }
    });

    test('Int16', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(2);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 1000, 'int16');
            expect(pointer.read(0, 'int16')).toBe(1000);
        }
    });

    test('Uint16', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(2);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 5000, 'uint16');
            expect(pointer.read(0, 'uint16')).toBe(5000);
        }
    });

    test('Int32', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(4);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 20000, 'int32');
            expect(pointer.read(0, 'int32')).toBe(20000);
        }
    });

    test('Uint32', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(4);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 50000, 'uint32');
            expect(pointer.read(0, 'uint32')).toBe(50000);
        }
    });

    test('Int64', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(8);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, BigInt(1000000000000), 'int64');
            expect(pointer.read(0, 'int64')).toBe(BigInt(1000000000000));
        }
    });

    test('Uint64', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(8);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, BigInt(5000000000000), 'uint64');
            expect(pointer.read(0, 'uint64')).toBe(BigInt(5000000000000));
        }
    });

    test('Float32', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(4);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 3.14, 'float32');
            expect(pointer.read(0, 'float32')).toBeCloseTo(3.14);
        }
    });

    test('Float64', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(8);
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, 6.28, 'float64');
            expect(pointer.read(0, 'float64')).toBeCloseTo(6.28);
        }
    });
    
    // Checking if the freed memory is not fragmented into two parts,
    // which will prevent larger sizes from being allocated
    test("Coalesce", () => {
        const memory = new Memory(64);
        const lowerHalf = memory.malloc(32);
        const upperHalf = memory.malloc(32);
        lowerHalf.free()
        upperHalf.free()
        const pointer = memory.malloc(64)
        expect(pointer).not.toBeNull();
        if (pointer) {
            pointer.write(0, BigInt(1000000000000), 'uint64');
            expect(pointer.read(0, 'uint64')).toBe(BigInt(1000000000000));
        }
    });
});

describe('Memory Manipulation', () => {
    test('Compare', () => {
        const memory = new Memory(1024);
        const pointer1 = memory.malloc(10);
        const pointer2 = memory.malloc(10);

        // Test cmp
        memory.set(pointer1, 10, 10);
        memory.set(pointer2, 20, 10);
        expect(memory.cmp(pointer1, pointer2, 10)).toBe(-10);
    });

    test('Set', () => {
        const memory = new Memory(1024);
        const pointer = memory.malloc(10);

        // Test set
        memory.set(pointer, 30, 10);
        for (let i = 0; i < 10; i++) {
            expect(memory.HEAPU8[pointer!.offset + i]).toBe(30);
        }
    });

    test('Copy', () => {
        const memory = new Memory(1024);
        const pointer1 = memory.malloc(10);
        const pointer2 = memory.malloc(10);

        // Test cpy
        memory.set(pointer1, 40, 10);
        memory.cpy(pointer2, pointer1, 10);
        for (let i = 0; i < 10; i++) {
            expect(memory.HEAPU8[pointer2!.offset + i]).toBe(40);
        }
    });

    test('Move', () => {
        const memory = new Memory(1024);
        const pointer1 = memory.malloc(10);
        const pointer2 = memory.malloc(10);

        // Test move
        memory.set(pointer1, 50, 10);
        memory.move(pointer2, pointer1, 10);
        for (let i = 0; i < 10; i++) {
            expect(memory.HEAPU8[pointer2!.offset + i]).toBe(50);
        }
    });
});