// kiscan.ts - builds gltf libraries from step files
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

const kiscan = "kiscan 0.2";

const srcDir = "../../../kicad9share/kicad/3dmodels";
const outDir = "./output";

await Deno.mkdir(outDir, { recursive: true });

// eek chatgpt code ahead :)

function tryExtractPropertyValue(entities: any[], propDefId: number): string | null {
	const applied = entities.find(e =>
	e.type === "APPLIED_PROPERTY" &&
	e.params.includes(`#${propDefId}`)
	);
	if (!applied) return null;

	const valueEnt = entities.find(e =>
	e.type === "SIMPLE_PROPERTY_VALUE" &&
	e.params.includes(`#${applied.id}`)
	);

	if (valueEnt) {
	const m = /'([^']+)'/.exec(valueEnt.params);
	return m ? m[1] : null;
	}
	return null;
}

function kiCadMeta(entities: any[]) {
	const meta: any = {
		footprint: null,
		description: null,
		keywords: null,
		manufacturer: null,
		partNumber: null,
		author: null,
		license: null
	};

	// Find FILE_NAME or FILE_DESCRIPTION entities
	for (const e of entities) {
	if (e.type === "FILE_NAME") {
		const m = /'([^']*)'\s*,\s*'([^']*)'/.exec(e.params);
		if (m) {
		meta.name = m[1].trim();
		const timestamp = m[2];
		}
		// Sometimes author and organization are here
		const parts = e.params.split(",").map((s: string) => s.trim().replace(/^'|'$/g, ""));
		if (parts.length > 3) {
		meta.author = parts[3];
		}
	}

	if (e.type === "FILE_DESCRIPTION") {
		const m = /\('([^']+)'.*\)/.exec(e.params);
		if (m) meta.description = m[1];
	}

	// Most important: look for PROPERTY_DEFINITION with name 'kicad_footprint'
	if (e.type === "PROPERTY_DEFINITION") {
		if (e.params.includes("'kicad_footprint'")) {
		// Find the associated SIMPLE_PROPERTY_VALUE
		const propId = e.id;
		const valueEnt = entities.find(ent =>
			ent.type === "SIMPLE_PROPERTY_VALUE" &&
			ent.params.includes(`#${propId}`)
		);
		if (valueEnt) {
			const match = /'([^']+)'/.exec(valueEnt.params);
			if (match) meta.footprint = match[1];
		}
		}
		// Also check for manufacturer, part number, etc.
		const nameMatch = /'([^']+)'/.exec(e.params);
		if (nameMatch) {
		const name = nameMatch[1].toLowerCase();
		if (name.includes("manufacturer")) meta.manufacturer = tryExtractPropertyValue(entities, e.id);
		if (name.includes("part number") || name.includes("mpn")) meta.partNumber = tryExtractPropertyValue(entities, e.id);
		if (name.includes("keywords")) meta.keywords = tryExtractPropertyValue(entities, e.id);
		if (name.includes("license")) meta.license = tryExtractPropertyValue(entities, e.id);
		}
	}
	}

	return meta;
}

// code below tested and no longer crashing, models load in Windows 11

function encodeGLTFBuffer(vertices: Float32Array, indices: Uint16Array): string {
	const totalByteLength = vertices.byteLength + indices.byteLength;
	const buffer = new ArrayBuffer(totalByteLength);
	const raw = new Uint8Array(buffer);
	raw.set(new Uint8Array(vertices.buffer, vertices.byteOffset, vertices.byteLength), 0);
	raw.set(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength), vertices.byteLength);
	let encoded = '';
	const chunkSize = 0x8000;
	for (let i = 0; i < raw.length; i += chunkSize) {
		encoded += String.fromCharCode.apply(null, raw.subarray(i, i + chunkSize));
	}
	return encoded;
}

function createGLTF(stepJson: { entities: any[] }) {
	const points = stepJson.entities
	.filter(e => e.type === "CARTESIAN_POINT")
	.map(e => {
		const match = /\(([^)]+)\)/.exec(e.params);
		if (!match) return [0,0,0];
		return match[1].split(",").map(Number);
	});
	const vertices = new Float32Array(points.flat());
	const edges = stepJson.entities
	.filter(e => e.type === "ORIENTED_EDGE" || e.type === "EDGE_CURVE");
	const indices: number[] = [];
	// TODO: edges make polygons
	edges.forEach(e => {
	const refs = e.params.match(/#\d+/g)?.map(r => parseInt(r.replace("#","")) - 1);
	if (refs && refs.length >= 3) {
		indices.push(refs[0], refs[1], refs[2]);
	}
	});
	const indexArray = new Uint16Array(indices);
	const base64 = encodeGLTFBuffer(vertices, indexArray);
	const gltf = {
		asset: { version: "2.0" },
		scenes: [{ nodes: [0] }],
		nodes: [{ mesh: 0 }],
		meshes: [{
			primitives: [{
			attributes: { POSITION: 0 },
			indices: 1
			}]
		}],
		accessors: [
			{ bufferView: 0, componentType: 5126, count: vertices.length / 3, type: "VEC3" },
			{ bufferView: 1, componentType: 5123, count: indexArray.length, type: "SCALAR" }
		],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: vertices.byteLength },
			{ buffer: 0, byteOffset: vertices.byteLength, byteLength: indexArray.byteLength }
		],
		buffers: [
			{
				byteLength: vertices.byteLength + indexArray.byteLength,
				uri: "data:application/octet-stream;base64," + btoa(base64)
			}
		]
	};
	return gltf;
}

// Helper: extract nested params

function extractParams(entity: string): string {
	const parenStart = entity.indexOf("(");
	if (parenStart < 0) return "";

	let depth = 1;
	let i = parenStart + 1;
	while (i < entity.length && depth > 0) {
		if (entity[i] === "(") depth++;
		else if (entity[i] === ")") depth--;
		i++;
	}

	return entity.slice(parenStart + 1, i - 1).trim();
}

// Parse a single STEP file into JSON entities

async function parseStepFile(filePath: string) {
	const text = await Deno.readTextFile(filePath);
	const rawEntities = text
		.split(";")
		.map(e => e.trim())
		.filter(e => e.startsWith("#"));

	const entities: { id: number; type: string; params: string; external: boolean }[] = [];

	for (const raw of rawEntities) {
		const idMatch = /^#(\d+)\s*=\s*(\*?\w+)?/.exec(raw);
//		const idMatch = /^#(\d+)\s*=\s*(\*?\w+)/.exec(raw);
		if (!idMatch) {
			console.log("!idMatch",raw);
			continue;
		}
		const id = parseInt(idMatch[1]);
		const type = idMatch[2]||"";
		const params = extractParams(raw);
		const external = type.includes("EXTERNAL");
		const entity={ id, type, params, external };
		entities.push(entity);
		if(external){
			console.log("external",entity);
		}
	}

	return { file: filePath, entities };
}

let count=0;

console.log(kiscan)

for await (const entry of walk(srcDir, { exts: [".step", ".stp"] })) {
	const stepJSON = await parseStepFile(entry.path);
	const gltf=createGLTF(stepJSON);
	count++;
	const gltfJSON=JSON.stringify(gltf, null, 2);
	const path = join(outDir, basename(entry.path) + ".gltf");
	await Deno.writeTextFile(path,gltfJSON);
//	const outPath = join(outDir, basename(entry.path) + ".json");
//	await Deno.writeTextFile(outPath, JSON.stringify(stepJSON, null, 2));
//	console.log(`Parsed ${entry.path} → ${outPath}`);
}

console.log("complete collected:",count)
