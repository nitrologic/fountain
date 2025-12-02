// kiscan.ts - builds gltf libraries from step files
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

const kiscan = "kiscan 0.2";

const srcDir = "../../../kicad9share/kicad/3dmodels";
const outDir = "./output";

await Deno.mkdir(outDir, { recursive: true });

function parseSteps(entities: any[]) {
	const steps=[];
	entities.forEach(item => {
		const id=parseInt(item.id);
		if(id){
			steps[id]=item;
		}
	});
	return steps;
}

function parseStyles(entities: any[]){
	const styles=[];
	const styleItems = entities.filter(e => e.type === "PRESENTATION_STYLE_ASSIGNMENT");
	styleItems.forEach(item => {
		const params = item.params.split(",");
		const index=parseInt(params[0]);
		const id=parseInt(item.id);
		if(id){
			styles[id]=index;
			console.log("style",{id,index,item});
		}
	});
	return styles;
}

function parseColors(entities: any[]) {
	const colors=[];
	const colorItems = entities.filter(e => e.type === "COLOUR_RGB");
	colorItems.forEach(item => {
		const nrgb = item.params.split(",");
		const rgb=[parseFloat(nrgb[1]),parseFloat(nrgb[2]),parseFloat(nrgb[3])];
//		console.log("color item",item,rgb);
		const id=parseInt(item.id);
		if(id){
			colors[id]=rgb;
		}
	});
	return colors;
}

function resolveColor(steps:[],styles:number[],colors:number[],id: number){
	if (id in colors) return colors[id];
	if (id in styles){
		const index=styles[id];
		if (index in colors) return colors[index];
	}
	console.log("resolveColor failure id",id,steps[id])
	return [0,0,0];
}

function logStyles(entities: any[]) {
	const steps=parseSteps(entities);
	const styles=parseStyles(entities);
	const colors=parseColors(entities);
	const styleItems = entities.filter(e => e.type === "STYLED_ITEM");
	styleItems.forEach(item => {
//		console.log("style item",item);
		const refs = item.params.match(/#\d+/g) || [];
		const styleRef = parseInt(refs[0].slice(1), 10);
		const targetId = parseInt(refs[1].slice(1), 10);
		const color = resolveColor(steps,styles,colors,styleRef);
		console.log("style color",{styleRef,targetId,color});
	});
}
// eek chatgpt code ahead :)

function kiCadMeta(entities: any[]) {
	const meta: any = { product:"Jon Doe" };
	const productStep = entities.find(e => e.type === "PRODUCT");
	if (productStep) {
		const m = /'([^']+)'/.exec(productStep.params);
		if (m) {
			const code=m[0];
			const name=m[1];
			const inputs=m["input"]||[];
			const groups=m["groups"];
// todo: assert on index or groups
			meta.product = name;
			meta.inputs = inputs;
//			console.log("kicadMeta",{meta,m});
			if(m["index"]){
				console.log("kicadMeta index",m.index);
			}
			if(groups){
				console.log("kicadMeta groups",groups);
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

function createGLTF(steps: { entities: any[] }) {
	logStyles(steps.entities);

//	console.log("steps",steps);

	const meta=kiCadMeta(steps.entities);
//	console.log("meta",meta);

	const points = steps.entities
	.filter(e => e.type === "CARTESIAN_POINT")
	.map(e => {
		const match = /\(([^)]+)\)/.exec(e.params);
		if (!match) return [0,0,0];
		return match[1].split(",").map(Number);
	});
	const vertices = new Float32Array(points.flat());
	const edges = steps.entities
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
		nodes: [{ mesh: 0, extras:{meta} }],
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
