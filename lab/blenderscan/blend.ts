// blend.ts - builds gltf libraries from blender files
// thanks to kimi k2 for assistance
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

const path="C:\\nitrologic\\dsptool\\cbmpico\\models\\commodore-64-computer-full-pack\\source";

let count=0;
console.log("blend 0.01");

for await (const entry of walk(path, { exts: [".blend"] })) {
    console.log(entry.path);
    count++;
}

console.log("complete collected:",count)
