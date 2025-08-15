// a raw mode prompt replacement
// roha.config.rawprompt is not default
// arrow navigation and tab completion incoming
// a reminder to enable rawprompt for new modes

// new version with timeout

// const promptTimeout = new AbortController();

// const text=SaveCursorA + AnsiHome + AnsiClear + frame + RestoreCursorA;

// stdin logging disabled

// wtf is promptBuffer and who wrote this???

const bibliPath=resolve(appDir,"bibli.json");
const bibli=JSON.parse(await Deno.readTextFile(bibliPath));

const encoder=new TextEncoder();
const decoder=new TextDecoder("utf-8");

const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();

let promptBuffer=new Uint8Array(0);
let slopFrame=0;

// promptForge 𓅠
const slopFrames=[];

function replaceShortcode(text: string): string {
	return text.replace(/:([a-z_]+):/g, (match, code) => {
		return bibli.spec.shortcode[code] || match;
	});
}

export async function rawPrompt(message:string,refreshInterval:boolean) {
	let result="";
	if(message){
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
// todo: paging tests
//	if(roha.config.page) {
//		await writer.write(homeCursor);
//	}

	let busy=true;
	let timer;

	if(refreshInterval){
		timer = setInterval(async() => {
			const line=decoder.decode(promptBuffer);
			await refreshBackground(5,message+line);
		}, 1000);
	}

	Deno.stdin.setRaw(true);

	while (busy) {
		try {
			const { value, done }=await reader.read();
			if (done || !value) break;
			const bytes=[];
			for (const byte of value) {
				if (byte === 0x7F || byte === 0x08) { // Backspace
					if (promptBuffer.length > 0) {
						promptBuffer=promptBuffer.slice(0, -1);
						bytes.push(0x08, 0x20, 0x08);
					}
				} else if (byte === 0x1b) { // Escape sequence
					if (value.length === 1) {
						throw("ExitForge");
//						await exitForge();
//						Deno.exit(0);
					}
					if (value.length === 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							console.log("[RAW] F1");
						}
					}
					break;
				} else if (byte === 0x0A || byte === 0x0D) { // Enter key
					bytes.push(0x0D, 0x0A);
					const line=decoder.decode(promptBuffer);
					const n = encoder.encode(line).length;
//					let n=line.length;
					if (n > 0) {
						promptBuffer=promptBuffer.slice(n);
					}
					result=line.trimEnd();
//					await logForge(result, "stdin");
					busy=false;
				} else {
					bytes.push(byte);
					// this is a heavy weight ooverwrite of promptBuffer
					const buf=new Uint8Array(promptBuffer.length + 1);
					buf.set(promptBuffer);
					buf[promptBuffer.length]=byte;
					promptBuffer=buf;
					if (byte === 0x3A) { // Colon ':'						
					}
				}
			}
			if (bytes.length) await writer.write(new Uint8Array(bytes));
		}catch(error){
			console.error("Prompt error:", error);
			console.error("Please consider disabling rawprompt in config");
			busy=false;
		}
	}
	Deno.stdin.setRaw(false);
//	reader.cancel();
	if (timer) clearInterval(timer);
//	if(roha.config.page) await writer.write(homeCursor);
	return result;
}

// const writer=Deno.stdout.writable.getWriter();

export async function refreshBackground(ms,line) {
	await new Promise(resolve => setTimeout(resolve, ms));
	if(slopFrames.length&&slopFrame!=slopFrames.length){
		slopFrame=slopFrames.length;
		const frame=slopFrames[slopFrame-1];
//		const message=AnsiHome + frame + AnsiCursor + row + ";1H\n" + prompt+line;
		const message=AnsiHome + frame + ansiPrompt() + line;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
}
