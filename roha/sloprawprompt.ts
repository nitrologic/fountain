// a raw mode prompt replacement
// roha.config.rawprompt is not default
// arrow navigation and tab completion incoming
// a reminder to enable rawprompt for new modes

// shortcode input support

const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();

const bibli=JSON.parse(await Deno.readTextFile("./bibli.json"));
const shortcode=bibli.spec.shortcode;

function old_replaceShortcode(input:string): string {
	return input.replace(/:([a-z_]+):/g, (match, code) => {
		return shortcode[code] || match;
	});
}

// grapheme clusters are the new u8

const encoder=new TextEncoder();
const decoder=new TextDecoder("utf-8");
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

let grapheme:string[]=[];

function addInput(input:string) {
	grapheme.push(...(input.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic}\u200D?)+|./gu) || []));
//	grapheme.push(...[...segmenter.segment(input)].map(segment => segment.segment));
}

function backspace(bytes:number[]) {
	if (grapheme.length){
		const lastChar = grapheme.pop()!;
		const width = stringWidth(lastChar) || 1;
		for (let i = 0; i < width; i++) {
			bytes.push(0x08, 0x20, 0x08);
		}
	}
}

function replaceText(bytes:[],count:number,text:string){
	for(let i=0;i<count;i++){
		backspace(bytes);
	}
	const raw=encoder.encode(text);
	for(let i=0;i<raw.length;i++){
		bytes.push(raw[i]);
	}
}

// grapheme geometry

// a simple fallback for platforms with special needs - windows terminals :eyes:
// emoji wide char groups may need cludge for abnormal plungers
// unicode ranges featuring wide chars

const WideRanges = [
	[0x1100, 0x115F],[0x2329, 0x232A],[0x2600, 0x26FF],
	[0x2E80, 0x303E],[0x3040, 0xA4CF],[0xAC00, 0xD7A3],
	[0xF900, 0xFAFF],[0xFE10, 0xFE19],[0xFE30, 0xFE6F],[0xFF00, 0xFF60],[0xFFE0, 0xFFE6],
	[0x1F000, 0x1F02F],[0x1F0A0, 0x1F0FF],[0x1F100, 0x1F1FF],[0x1F300, 0x1F9FF],
	[0x20000, 0x2FFFD],[0x30000, 0x3FFFD]
];
const isWide = (cp: number) => WideRanges.some(([start, end]) => cp >= start && cp <= end);
export function stringWidth(text:string):number{
	let w = 0;
	for (const ch of text) {
		const codePoint=ch.codePointAt(0) ?? 0;
		w += isWide(codePoint) ? 2 : 1;
	}
	return w;
}

// terminal history

let currentInput="";
let historyIndex = -1;
const history:string[]=[];

async function navigateHistory(direction: 'up'|'down') {
	if (historyIndex === -1 && direction === 'up') {
		currentInput=grapheme.join("");
	}
	// Calculate new index
	const newIndex = Math.max(-1,
	Math.min(historyIndex + (direction === 'up' ? 1 : -1), history.length - 1));
	if (newIndex === historyIndex) return;
	historyIndex = newIndex;
	// Get the history item or current input
	const displayText = historyIndex >= 0 ? history[historyIndex] : currentInput;
	// ANSI sequence to:
	// 1. Move to start of line
	// 2. Clear line
	// 3. Write new content
	await writer.write(encoder.encode('\r' + ANSI.CLEAR_LINE + displayText));
	grapheme = [...segmenter.segment(displayText)].map(segment => segment.segment);
}

const CURSOR_UP=65;
const CURSOR_DOWN=66;
const CURSOR_RIGHT=67;
const CURSOR_LEFT=68;

function onCursor(bytes,code: number) {
	switch(code) {
		case CURSOR_LEFT:
			bytes.push(0x1B, 0x5B, 0x44);
			break;
		case CURSOR_RIGHT:
			bytes.push(0x1B, 0x5B, 0x43);
			break;
		case CURSOR_UP:
			navigateHistory('up');
			break;
		case CURSOR_DOWN:
			navigateHistory('down');
			break;
	}
}

let slopFrame=0;
let inCode=false;
let codePos=0;

const ANSI={
	SAVE_CURSOR:'\x1B[s',
	RESTORE_CURSOR:'\x1B[u',
	CLEAR_LINE:'\x1B[K',
	CLEAR_LINE_START:'\x1B[1K',
	CLEAR_LINE_FULL:'\x1B[2K'
};

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
			const line=grapheme.join("");
			await refreshBackground(5,message+line);
		}, 1000);
	}
	Deno.stdin.setRaw(true);
	while (busy) {
		try {
			const { value, done }=await reader.read();
			if (done || !value) break;
			let bytes=[];
			for (const byte of value) {
				if (byte === 0x7F || byte === 0x08) { // Backspace
					backspace(bytes);
				} else if (byte === 0x1b) { // Escape sequence
					if (value.length === 1) {
						return null;
					}
					if (value.length >= 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							console.log("[RAW] F1");
						}
						 if (value[1] === 0x5b) { // CSI
							onCursor(bytes,value[2]);
						 }
					}
					break;
				} else if (byte === 0x0A || byte === 0x0D) { // Enter key
					bytes.push(0x0D, 0x0A);
					const line=grapheme.join("");
					grapheme=[];
					result=line.trimEnd();
//					await logForge(result, "stdin");
					busy=false;
				} else {
					bytes.push(byte);
					const char = decoder.decode(new Uint8Array([byte])); // Fix: Decode single byte to char
					addInput(char);
					if (byte === 0x3A) { // Colon ':'
						const n=grapheme.length;
						if(inCode){
							if(n>codePos){
								const words=grapheme.slice(codePos, n - 1).join("");
								const lower=words.toLowerCase();
								if(lower in shortcode){
									const count=stringWidth(words)+2;
									replaceText(bytes,count,shortcode[lower]+"\ufe0f");	//200c FE0F
								}
							}
							inCode=false;
						}else{
							inCode=true;
							codePos=n;
						}
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
	history.push(result);
	inCode=false;
	return result;
}

// const writer=Deno.stdout.writable.getWriter();
// promptForge 𓅠

const slopFrames=[];

export async function refreshBackground(ms,line) {
	await new Promise(resolve => setTimeout(resolve, ms));
	if(slopFrames.length&&slopFrame!=slopFrames.length){
		slopFrame=slopFrames.length;
		const frame=slopFrames[slopFrame-1];
//		const message=ANSI.Home + frame + AnsiCursor + row + ";1H\n" + prompt+line;
		const message=ANSI.Home + frame + ansiPrompt() + line;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
}
