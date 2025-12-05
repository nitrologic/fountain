// blend.ts - builds gltf libraries from blender files
// thanks to grok and kimi k2 for assistance
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";


import { init as initZstd, decompress as decompressZstd } from 'deno.land';

async function decompress(data: Uint8Array): Uint8Array {
	console.log("blender decompresss 0.0")
}

/*
import { inflate as decompressZlib } from "jsr:@deno-library/compress";
import { init as initZstd, decompress as decompressZstd } from 'deno.land';

await initZstd();

async function decompress(data: Uint8Array): Uint8Array {
	try {
		const result = await decompressZstdPromise(data);
		console.log("Decompressed using Zstandard (NPM package).");
		return new Uint8Array(result);
//		const result = decompressZlib(data);
//		return result;
	} catch (error) {
		throw new Error("Decompression failure " + error.message);
	}
}
*/
//import { init as initZstd, decompress as decompressZstd } from 'zstd-wasm';
//import { inflate as decompressZlib } from "jsr:@deno-library/compress";

//await initZstd(); 

//import { compress, decompress } from "jsr:@whoughton/lz77";
// import { deflate,  inflate,  deflateRaw,  inflateRaw,} from "jsr:@deno-library/compress";
/*
import { inflate as decompressZlib } from "jsr:@deno-library/compress";
function decompress(data: Uint8Array): Uint8Array {
	try {
		const result = decompressZlib(data);
		return result;
	} catch (error) {
		throw new Error("Decompression failed using Zlib/Inflate: " + error.message);
	}
}
*/
//import { init, decompress } from "jsr:@deno-library/compress/zstd";
//import { deflate,  inflate,  deflateRaw,  inflateRaw,} from "jsr:@deno-library/compress";
// //"jsr:@deno-library/compress@^0.13.0";
//import { decompress } from "npm:zstd@1.0.4";

function readString(buf: Uint8Array, off: number, len: number) {
	return decoder.decode(buf.slice(off, off + len)).replace(/\0+$/, "");
}

async function readBlock(file: Deno.FsFile, pointerSize: number, endianLittle: boolean) {
	const header = new Uint8Array(16 + pointerSize);
	const r = await file.read(header);
	if (!r) return null;
	const code = decoder.decode(header.slice(0, 4));
	const size = new DataView(header.buffer).getUint32(4, endianLittle);
	const sdna = new DataView(header.buffer).getUint32(8 + pointerSize, endianLittle);
	const count = new DataView(header.buffer).getUint32(12 + pointerSize, endianLittle);
	const body = new Uint8Array(size);
	await file.read(body);
	return { code, size, sdna, count, body };
}

async function readBlend(path: string) {
	const file = await Deno.open(path, { read: true });
	const hdr = new Uint8Array(12);
	await file.read(hdr);
	const magic = decoder.decode(hdr.slice(0, 7));
	const ptr = hdr[7] === 95 ? "64" : "32";
	const endian = hdr[8] === 118 ? "little" : "big";
	const version = decoder.decode(hdr.slice(9, 12));

	console.log("header", {
		magic,
		pointerSize: ptr,
		endian,
		version
	});

	if (magic !== "BLENDER") return;

	const pointerSize = hdr[7] === 95 ? 8 : 4;
	const endianLittle = hdr[8] === 118;

	const blocks: any[] = [];

	while (true) {
		const b = await readBlock(file, pointerSize, endianLittle);
		if (!b) break;
		if (b.code === "ENDB") break;

		if (b.code === "\x00\x00\x00\x00") {
			const block = decompress(b.body);
//          const block = inflate(b.body); 
			console.log("xblock",b);
		}else{
			console.log("block", { code: b.code, size: b.size, sdna: b.sdna, count: b.count });
		}
		blocks.push(b);
	}
/*
	while (true) {
		const b = await readBlock(file, pointerSize, endianLittle);
		if (!b) break;
		if (b.code === "ENDB") break;
		blocks.push(b);
	}
*/		
	file.close();

	const objects = blocks
		.filter(b => b.code === "OB")
		.map(b => {
			const id = readString(b.body, 0, 66).replace(/^OB/, "");
			const dv = new DataView(b.body.buffer);
			const t = dv.getUint16(66, endianLittle);
			const tn = ["Empty","Mesh","Curve","Surface","Meta","Font","Armature","Lattice","Empty","Camera","Lamp"][t] || "Unknown";
			return { name: id.trim(), type: tn };
		});

	console.log(path);
	for (const o of objects) console.log(o.type, o.name);
}

const decoder = new TextDecoder();

const path="C:\\nitrologic\\dsptool\\cbmpico\\models\\commodore-64-computer-full-pack\\source";

let count=0;
console.log("blend 0.01");

for await (const entry of walk(path, { exts: [".blend"] })) {
		const blendPath=entry.path;
		console.log(entry.path);
		await readBlend(blendPath);
		count++;
}

console.log("complete collected:",count)

