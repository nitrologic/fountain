// a raw mode prompt replacement
// roha.config.rawprompt is not default
// arrow navigation and tab completion incoming
// a reminder to enable rawprompt for new modes

// new version with timeout

// const promptTimeout = new AbortController();

// const text=SaveCursorA + AnsiHome + AnsiClear + frame + RestoreCursorA;

// stdin logging disabled

// purpose of promptBuffer? - delete key stuff? - array of codepoints?

let promptBuffer=new Uint8Array(0);
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

const encoder=new TextEncoder();
const decoder=new TextDecoder("utf-8");

const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();

const bibli=JSON.parse(await Deno.readTextFile("./bibli.json"));
const shortcode=bibli.spec.shortcode;

let currentInput="";
let historyIndex = -1;
const history:string[]=[];

async function navigateHistory(direction: 'up'|'down') {
	// Save current input if we're just starting history navigation
	if (historyIndex === -1 && direction === 'up') {
		currentInput = decoder.decode(promptBuffer);
	}

	// Calculate new index
	const newIndex = Math.max(-1,
	Math.min(historyIndex + (direction === 'up' ? 1 : -1),
	history.length - 1));
	if (newIndex === historyIndex) return;
	historyIndex = newIndex;
	// Get the history item or current input
	const displayText = historyIndex >= 0 ? history[historyIndex] : currentInput;
	// ANSI sequence to:
	// 1. Move to start of line
	// 2. Clear line
	// 3. Write new content
	await writer.write(encoder.encode('\r' + ANSI.CLEAR_LINE + displayText));
	promptBuffer = encoder.encode(displayText);
}

function onCursor(code: number) {
	switch(code) {
		case CURSOR_UP:
			navigateHistory('up');
			break;
		case CURSOR_DOWN:
			navigateHistory('down');
			break;
	}
}

const CURSOR_UP=65;
const CURSOR_DOWN=66;
const CURSOR_LEFT=67;
const CURSOR_RIGHT=68;

function replaceShortcode(text: string): string {
	return text.replace(/:([a-z_]+):/g, (match, code) => {
		return bibli.spec.shortcode[code] || match;
	});
}
function replaceText(count:number,text:string):[]{
	const bytes=[];
	if (promptBuffer.length > 0) {
		promptBuffer=promptBuffer.slice(0,-count);
		for(let i=0;i<count;i++){
			bytes.push(0x08);
		}
	}
	const raw=encoder.encode(ANSI.CLEAR_LINE+text);//.normalize("NFKC"));
	for(let i=0;i<raw.length;i++){
		bytes.push(raw[i]);
	}
	return bytes;
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
			let bytes=[];
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
					if (value.length >= 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							console.log("[RAW] F1");
						}

						 if (value[1] === 0x5b) { // CSI
//							console.log("[RAW] 0x5B ",value[2]);
							onCursor(value[2]);
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
						const n=promptBuffer.length;
						if(inCode){
							if(n>codePos){
								const words=promptBuffer.subarray(codePos,n-1);
								const lower=decoder.decode(words).toLowerCase();
								if(lower in shortcode){
									bytes=replaceText(n-codePos,shortcode[lower]+"\u200c");	//FE0F
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
//		const message=AnsiHome + frame + AnsiCursor + row + ";1H\n" + prompt+line;
		const message=AnsiHome + frame + ansiPrompt() + line;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
}
