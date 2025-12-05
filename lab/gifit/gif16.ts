// Here is the corrected `gif16.ts`. I have fixed the LZW compression logic (specifically the
// dictionary code assignments and bit-packing) and removed the incorrect pixel packing step, as GIF
// compression operates directly on palette indices.


// gif16.ts - streams gif (fixed)
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

const u16le = (n: number): number[] => [n & 255, n >> 8 & 255];
const header = "GIF89a".split("").map(c => c.charCodeAt(0));

export class GIF16 {
        #w; #h; #px; #py; #cw; #ch; #bg; #pal; #frame; #bytes: number[] = [];

        constructor(
                width = 320, height = 200,
                palette = new Uint8Array([0, 0, 0, 255, 255, 255, 104, 55, 43, 112, 164, 178, 111, 61, 134, 88, 141, 67, 53, 136, 72, 184, 199, 111, 110, 79, 37, 67, 103, 89, 154, 103, 89, 100, 103, 78, 188, 210, 132, 108, 94, 181, 255, 255, 255].flatMap((v, i) => i % 3 ? v : [])), // default C64 16-col
                borderIndex = 0,
                canvasW = 384, canvasH = 272, // adjusted for border area
                playfieldX = 32, playfieldY = 36
        ) {
                this.#w = width; this.#h = height;
                this.#px = playfieldX; this.#py = playfieldY;
                this.#cw = canvasW; this.#ch = canvasH;
                this.#bg = borderIndex & 15;
                this.#pal = palette;
                this.#frame = new Uint8Array(width * height);
                this.#bytes.push(...header, ...this.#lsd(), ...this.#gct(), ...this.#appext());
        }

        setPixel(x: number, y: number, c: number) {
                if (x >= 0 && x < this.#w && y >= 0 && y < this.#h) this.#frame[y * this.#w + x] = c & 15;
        }

        setBorder(c: number) { this.#bg = c & 15; }

        addFrame(delay = 4) {
                // 16 colors = 4 bits. Min code size for LZW is 4.
                const minCodeSize = 4;
                const lzwData = this.#compress(this.#frame, minCodeSize);

                this.#bytes.push(
                        ...this.#gce(delay),
                        0x2C, // Image Separator
                        ...u16le(this.#px), ...u16le(this.#py), // Left, Top
                        ...u16le(this.#w), ...u16le(this.#h),   // Width, Height
                        0x00, // Packed (no local table, no interlace)
                        minCodeSize
                );

                for (let i = 0; i < lzwData.length; i += 255) {
                        const chunk = lzwData.subarray(i, i + 255);
                        this.#bytes.push(chunk.length, ...chunk);
                }
                this.#bytes.push(0); // Block Terminator
        }

        finish() {
                this.#bytes.push(0x3B); // Trailer
                return new Uint8Array(this.#bytes);
        }

        #lsd() {
                // Logical Screen Descriptor: w, h, packed(global table flag + res + sort + size), bg, aspect
                return [...u16le(this.#cw), ...u16le(this.#ch), 0xF3, this.#bg, 0];
        }

        #gct() {
                const t = new Uint8Array(48); // 16 colors * 3 bytes
                // Copy provided palette, ensuring we don't overflow if palette is short
                const len = Math.min(this.#pal.length, 48);
                t.set(this.#pal.subarray(0, len));
                return [...t];
        }

        #appext() {
                return [33, 255, 11, ...("NETSCAPE2.0".split("").map(c => c.charCodeAt(0))), 3, 1, 0, 0, 0];
        }

        #gce(d: number) {
                // Graphic Control Extension: ext intro, label, size, packed(disposal=1), delay, trans index, terminator
                return [33, 249, 4, 0x04, ...u16le(d), 0, 0];
        }

        #compress(data: Uint8Array, minCodeSize: number) {
                const clearCode = 1 << minCodeSize;
                const eoiCode = clearCode + 1;
                let nextCode = eoiCode + 1;
                let codeSize = minCodeSize + 1;

                const dict = new Map<string, number>();
                const resetDict = () => {
                        dict.clear();
                        for (let i = 0; i < clearCode; i++) dict.set(String(i), i);
                        nextCode = eoiCode + 1;
                        codeSize = minCodeSize + 1;
                };

                resetDict();

                const out: number[] = [];
                let buf = 0;
                let bits = 0;

                const emit = (c: number) => {
                        buf |= c << bits;
                        bits += codeSize;
                        while (bits >= 8) {
                                out.push(buf & 255);
                                buf >>= 8;
                                bits -= 8;
                        }
                };

                emit(clearCode);

                let prefix = String(data[0]);
                for (let i = 1; i < data.length; i++) {
                        const char = data[i];
                        const key = prefix + "," + char;
                        if (dict.has(key)) {
                                prefix = key;
                        } else {
                                emit(dict.get(prefix)!);
                                dict.set(key, nextCode++);

                                // Increase code size if needed
                                if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;

                                // Reset if max code reached (4096)
                                if (nextCode === 4096) {
                                        emit(clearCode);
                                        resetDict();
                                }
                                prefix = String(char);
                        }
                }
                emit(dict.get(prefix)!);
                emit(eoiCode);

                if (bits > 0) out.push(buf & 255);
                return new Uint8Array(out);
        }
}

// demo
if (import.meta.main) {
        const gif = new GIF16();

        // Generate 32 frames
        for (let f = 0; f < 32; f++) {
                for (let y = 0; y < 200; y++) {
                        for (let x = 0; x < 320; x++) {
                                // Simple XOR pattern
                                gif.setPixel(x, y, (x >> 4 ^ y >> 4 ^ f) & 15);
                        }
                }
                // Cycle border color
                gif.setBorder(f & 15);
                gif.addFrame(6); // 60ms delay
        }

        try {
                await Deno.mkdir("output", { recursive: true });
        } catch {}

        await Deno.writeFile("output/test3.gif", gif.finish());
        console.log("wrote output/test3.gif");
}