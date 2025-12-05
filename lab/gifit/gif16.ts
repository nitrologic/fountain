// gif16.ts - streams gif (fixed)
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

const c64_rgb = [
	0,0,0,255,255,255,104,55,43,112,164,178,111,61,134,88,141,67,53,136,72,184,199,111,110,79,37,67,103,89,154,103,89,100,103,78,188,210,132,108,94,181,255,255,255
];

const u16le = (n: number): number[] => [n & 255, (n >> 8) & 255];
const header = "GIF89a".split("").map(c => c.charCodeAt(0));

class GIF16 {
	#w: number; #h: number; #bg: number; #pal: Uint8Array; #frame: Uint8Array; #bytes: number[] = [];

	constructor(
		width = 320, height = 200,
		palette = new Uint8Array(c64_rgb.flatMap((v, i) => i % 3 ? v : [])), // 16 * 3 = 48 bytes
		borderIndex = 0,
	) {
		this.#w = width; this.#h = height;
		this.#bg = borderIndex & 15;
		this.#pal = palette;
		this.#frame = new Uint8Array(width * height);
		this.#bytes.push(...header, ...this.#lsd(), ...this.#gct(), ...this.#appext());
	}

	setPixel(x: number, y: number, c: number) {
		this.#frame[y * this.#w + x] = c & 15; 
	}

	setPixelSafe(x: number, y: number, c: number) { if (x >= 0 && x < this.#w && y >= 0 && y < this.#h) this.#frame[y * this.#w + x] = c & 15; }
	setBorder(c: number) { this.#bg = c & 15; }

	#lsd() {
		// Packed: GCT flag = 1, Color resolution = 7 (arbitrary but benign), Sort=0, Size = 3 -> 2^(3+1)=16 entries
		const packed = (1 << 7) | (7 << 4) | 0 << 3 | 3; // 0xF3
		return [...u16le(this.#w), ...u16le(this.#h), packed, this.#bg, 0];
	}

	#gct() {
		// Our global color table: exactly 16 * 3 = 48 bytes
		const t = new Uint8Array(16 * 3);
		for (let i = 0; i < 16; i++) {
			t.set(this.#pal.subarray(i * 3, i * 3 + 3), i * 3);
		}
		return [...t];
	}

	#appext() {
		// Netscape loop extension (infinite loop: 0)
		return [0x21, 0xFF, 11, ...("NETSCAPE2.0".split("").map(c => c.charCodeAt(0))), 3, 1, 0, 0];
	}

	#gce(d: number) {
		// Graphic Control Extension: no transparency, disposal=0, user input flag=0
		// block: 0x21,0xF9,4,packed,delay_lo,delay_hi,transparency_index,0
		const packed = 0x00; // no transparency, no disposal specified
		return [0x21, 0xF9, 4, packed, ...u16le(d), 0 /*transparency index*/, 0];
	}

	addFrame(delay = 4) {
		// image position - whole screen
		const px = 0, py = 0;
		// pack: we MUST feed LZW with one index per pixel (0..15), not nibble-packed bytes
		const packed = this.#pack(); // returns Uint8Array of length w*h with values 0..15
		const lzwData = this.#compress(packed, 4); // min code size 4
		this.#bytes.push(...this.#gce(delay));
		this.#bytes.push(0x2C, ...u16le(px), ...u16le(py), ...u16le(this.#w), ...u16le(this.#h), 0x00);
		// LZW minimum code size byte
		this.#bytes.push(4);
		// data as sub-blocks
		for (let i = 0; i < lzwData.length; i += 255) {
			const c = lzwData.subarray(i, i + 255);
			this.#bytes.push(c.length, ...c);
		}
		// block terminator
		this.#bytes.push(0);
	}

	finish() { this.#bytes.push(0x3B); return new Uint8Array(this.#bytes); }

	#pack() {
		// return one 8-bit index per pixel (0..15)
		return this.#frame.slice(); // already each is 0..15 by setPixel
	}

	// --- LZW compressor for GIF (minCodeSize provided) ---
	#compress(data: Uint8Array, minCodeSize: number) {
		// GIF LZW: clear = 1<<minCodeSize, EOI = clear+1, codes begin after that
		const clear = 1 << minCodeSize;
		const eoi = clear + 1;
		let codeSize = minCodeSize + 1;

		// Initialize dictionary with single-byte sequences
		const dict = new Map<string, number>();
		const resetDict = () => {
			dict.clear();
			for (let i = 0; i < clear; i++) dict.set(String.fromCharCode(i), i);
		};
		resetDict();
		let nextCode = eoi + 1;

		let bitBuf = 0, bitLen = 0;
		const out: number[] = [];
		const emit = (code: number) => {
			bitBuf |= (code << bitLen);
			bitLen += codeSize;
			while (bitLen >= 8) {
				out.push(bitBuf & 0xFF);
				bitBuf >>>= 8;
				bitLen -= 8;
			}
		};

		// Start with CLEAR
		emit(clear);

		if (data.length === 0) {
			emit(eoi);
			if (bitLen) out.push(bitBuf & 0xFF);
			return new Uint8Array(out);
		}

		let w = String.fromCharCode(data[0]);

		for (let i = 1; i < data.length; i++) {
			const k = String.fromCharCode(data[i]);
			const wk = w + k;
			if (dict.has(wk)) {
				w = wk;
			} else {
				// output code for w
				emit(dict.get(w)!);
				// add wk to the dictionary
				if (nextCode < 4096) {
					dict.set(wk, nextCode++);
					// if nextCode reaches the limit for current codeSize, increase codeSize (up to 12)
					if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;
				} else {
					// dictionary full: emit CLEAR and reset
					emit(clear);
					resetDict();
					nextCode = eoi + 1;
					codeSize = minCodeSize + 1;
				}
				w = k;
			}
		}

		// output last code
		if (w.length) {
			emit(dict.get(w)!);
		}
		// EOI
		emit(eoi);
		// flush remaining bits
		if (bitLen > 0) out.push(bitBuf & 0xFF);
		return new Uint8Array(out);
	}
}

// ===== example usage (same as your original harness) =====

const path = "output/c64.gif";

if (import.meta.main) {
	const gif = new GIF16();
	for (let f = 0; f < 32; f++) {
		for (let y = 0; y < 200; y++) 
			for (let x = 0; x < 320; x++) 
				gif.setPixel(x, y, ((x >> 4) ^ f) & 15);
		gif.setBorder(f & 15);
		gif.addFrame(6);
	}
	// write file (Deno)
	await Deno.writeFile(path, gif.finish());
	console.log("wrote gif", path);
}
