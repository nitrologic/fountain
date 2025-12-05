import { deflate,  inflate,  deflateRaw,  inflateRaw,} from "jsr:@deno-library/compress@^0.13.0";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const originalString = "This is a zlib test in Deno.";
const data = encoder.encode(originalString);

// Compress with zlib header (standard zlib format)
const compressed = deflate(data);
console.log(`Compressed size: ${compressed.length} bytes`);

// Decompress (standard zlib format)
const decompressed = inflate(compressed);
const resultString = decoder.decode(decompressed);

console.log('Decompressed string:', resultString);
console.log(`Decompressed size: ${decompressed.length} bytes`);

// Use deflateRaw/inflateRaw for raw DEFLATE streams without headers/checksums
const compressedRaw = deflateRaw(data);
const decompressedRaw = inflateRaw(compressedRaw);
// ...
