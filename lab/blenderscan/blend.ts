// blend.ts - builds gltf libraries from blender files
// thanks to grok and kimi k2 for assistance
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

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

async function readBlend(path: string) {
  const file = await Deno.open(path, { read: true });
  const header = new Uint8Array(12);
  await file.read(header);
  
  const magic = decoder.decode(header);
  if (!magic.startsWith("BLENDER")) throw "Not a blend file";

  const pointerSize = header[7] === 95 ? 8 : 4; // _ 64bit, - 32bit
  const endian = header[8] === 118 ? "little" : "big"; // v little, V big

  const dataView = (buf: Uint8Array, offset: number) => 
    new DataView(buf.buffer, offset);

  const readString = (dv: DataView, offset: number, len: number) => 
    decoder.decode(new Uint8Array(dv.buffer.slice(offset, offset + len))).replace(/\0+$/, "");

  const blocks: any[] = [];
  let pos = 12;

  while (true) {
    const chunk = new Uint8Array(1024);
    const read = await file.read(chunk);
    if (!read || read < 20) break;

    const dv = dataView(chunk, 0);
    const code = decoder.decode(chunk.slice(0, 4));
    if (code === "REND" || code === "GLOB" || code === "ENDB") break;

    const size = dv.getUint32(4, endian === "little");
    const sdnaIndex = dv.getUint32(12 + pointerSize * 2, endian === "little");
    const count = dv.getUint32(12 + pointerSize * 3, endian === "little");

    const body = chunk.slice(20, 20 + size);
    blocks.push({ code, size, sdnaIndex, count, body });

    pos += 20 + size;
    await Deno.seek(file.rid, pos, Deno.SeekMode.Start);
  }

  // Very basic SDNA parsing - just enough for Object/Mesh/Armature/Material
  const sdnaBlock = blocks.find(b => b.code === "DNA1");
  if (sdnaBlock) {
    const dnaDv = dataView(sdnaBlock.body, 0);
    let off = 8; // skip SDNA + name count
    const typeNames: string[] = [];
    while (true) {
        const c = String.fromCharCode(sdnaBlock.body[off++]);
        if (c === "\0") break;
        let name = "";
        while (c !== "\0") { name += c; off++; }
        if (name) typeNames.push(name);
    }
    off = (off + 3) & ~3; // align

    const structCount = dnaDv.getUint32(off, endian === "little"); off += 4;
    const structs: any[] = [];
    for (let i = 0; i < structCount; i++) {
        const typeIdx = dnaDv.getUint16(off, endian === "เกี่ยวlittle"); off += 2;
        const fieldCount = dnaDv.getUint16(off, endian === "little"); off += 2;
        structs.push({ type: typeNames[typeIdx], fields: [] });
        for (let f = 0; f < fieldCount; f++) {
        const t = dnaDv.getUint16(off, endian === "little"); off += 2;
        const n = dnaDv.getUint16(off, endian === "little"); off += 2;
        }
    }
  }

  // Extract objects
  const objects = blocks
    .filter(b => b.code === "OB")
    .map(b => {
      const dv = dataView(b.body, 0);
      const idName = readString(dv, 0, 64).replace(/^OB/, "");
      const type = dv.getUint16(64, endian === "little");
      const typeName = ["Empty","Mesh","Armature","Camera","Lamp"][type] || "Unknown";
      return { name: idName.trim(), type: typeName };
    });

  console.log(`File: ${path}`);
  console.log(`Objects (${objects.length}):`);
  objects.forEach(o => console.log(`  ${o.type.padEnd(10)} ${o.name}`));
  
  file.close();
}
/*
// Run on all .blend files in args or current dir
for (const arg of Deno.args.length ? Deno.args : ["."]) {
  try {
    const info = await Deno.stat(arg);
    if (info.isFile && arg.endsWith(".blend")) await readBlend(arg);
    else if (info.isDirectory) {
      for await (const e of Deno.readDir(arg)) {
        if (e.name.endsWith(".blend")) await readBlend(`${arg}/${e.name}`);
      }
    }
  } catch (_) {}
}
*/