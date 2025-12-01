import { walk } from "https://deno.land/std/fs/mod.ts";
import { join, basename } from "https://deno.land/std/path/mod.ts";

const srcDir = "../../../kicad9share/kicad/3dmodels";
const outDir = "./output";

await Deno.mkdir(outDir, { recursive: true });


// Extracts everything inside the outermost parentheses, handling nested ones
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

// parse STEP ISO 10303 and tag external references
async function parseStepFile(filePath: string) {
	const text = await Deno.readTextFile(filePath);
	const entities: { id: number; type: string; params: string; external: boolean }[] = [];
	const entityRegex = /^#(\d+)\s*=\s*(\w+)\((.*)\);/gm;
	let match;

	while ((match = entityRegex.exec(text)) !== null) {
		const [_, id, type, params] = match;
// Detect external references by TYPE name
		const isExternal = type.startsWith("*") || type.includes("EXTERNAL");
		const entity={
			id: parseInt(id),
			type,
			params: params.trim()
		};
		if(isExternal){
			console.log("External",entity);
		}
//		console.log("e",entity);
		entities.push(entity);
	}
	return { file: filePath, entities };
}

for await (const entry of walk(srcDir, { exts: [".step", ".stp"] })) {
	const parsed = await parseStepFile(entry.path);
	const outPath = join(outDir, basename(entry.path) + ".json");
	await Deno.writeTextFile(outPath, JSON.stringify(parsed, null, 2));
//	console.log(`Parsed ${entry.path} → ${outPath}`);
}
