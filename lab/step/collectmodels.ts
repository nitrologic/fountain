import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

const srcDir = "../../../kicad9share/kicad/3dmodels";
const outDir = "./output";

await Deno.mkdir(outDir, { recursive: true });

// produce accurate json version of step ISO 10303
// throws "unsupported external data"
async function parseStepFile(filePath: string) {
	const text = await Deno.readTextFile(filePath);
	const entities: { id: number; type: string; params: string }[] = [];
	const entityRegex = /^#(\d+)\s*=\s*(\w+)\((.*)\);/gm;
	let match;
	while ((match = entityRegex.exec(text)) !== null) {
	const [_, id, type, params] = match;
	entities.push({
		id: parseInt(id),
		type,
		params: params.trim()
	});
	}
	return { file: filePath, entities };
}

for await (const entry of walk(srcDir, { exts: [".step", ".stp"] })) {
	const parsed = await parseStepFile(entry.path);
	const outPath = join(outDir, basename(entry.path) + ".json");
	await Deno.writeTextFile(outPath, JSON.stringify(parsed));
	console.log(`Parsed ${entry.path} → ${outPath}`);
}
