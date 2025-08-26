// slopprompt.ts - A raw mode prompt replacement for slop fountain
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

function echo(...data:any[]){
	console.error("[PORT]",data);
}

const messages=[];
function pushMessage(message,from){
	messages.push({message,from});
}

let slopConnection;
let slopListener;
let listenerPromise;
let receivePromise;

const readPromises=[];
const decoderConnection = new TextDecoder("utf-8");
const rxBufferSize=1e6;
const rxBuffer = new Uint8Array(rxBufferSize);
const rxDecoder=new TextDecoder("utf-8",{stream:true});


async function readConnection(connection:Deno.TcpConn){
	try{
		const n=await connection.read(rxBuffer);
		if(n>0){
			const bytes=rxBuffer.subarray(0,n);
			return {receive:bytes,source:connection};
		}
	}catch(error){
		echo("connection reset");
		// spawn a new listener
		return {};
	}
}

async function listenPort(port:number){
	if(!slopListener){
		echo("listening from fountain for slop on port",port);
		slopListener=Deno.listen({ hostname: "localhost", port, transport: "tcp" });
	}
	const connection=await slopListener.accept();
	echo("reading new connection");
	return  {connection};
}

export function listenService(){
	listenerPromise=listenPort(8081);
}

export async function announceCommand(words:string[]){
	const text=words.join(" ");
	if(slopConnection && text){
		const bytes=encoder.encode("/"+text);
		slopConnection?.write(bytes);
	}
}

export async function slopBroadcast(message:string,from:string){
	if(slopConnection && message && from){
		const json=JSON.stringify({messages:[{message,from}]});
		echo("json",json);
		const bytes=encoder.encode(json);		
		slopConnection?.write(bytes);
	}else{
		echo("help me");
	}
}

const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();

// shortcode :heart: mapping :eyes:

const bibli=JSON.parse(await Deno.readTextFile("./bibli.json"));
const shortcode=bibli.spec.shortcode;

// grapheme clusters are the new u8 ???

// see stringWidth(text:string) below for bespoke column counting of wide emoji

const encoder=new TextEncoder();
const decoder=new TextDecoder("utf-8");
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

let grapheme:string[]=[];

function addInput(input:string) {
	grapheme.push(...(input.match(/(\p{Emoji}\uFE0F?|\p{Emoji_Presentation}|\p{Extended_Pictographic}\u200D?[\p{Emoji_Modifier}\uFE0F]*)+|./gu) || []));
//	grapheme.push(...(input.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic}\u200D?)+|./gu) || []));
//	grapheme.push(...[...segmenter.segment(input)].map(segment => segment.segment));
}

function forwardCursor(bytes) {
	bytes.push(0x1b,'[','C',';');	//\x1b[C`
}

const TabWidth=8;
function backspace(bytes:number[]) {
	if (grapheme.length){
		const lastChar = grapheme.pop()!;
		const isTab=(lastChar=="\t");
		if(isTab){
			// instead of tracking cursor pos
			// pos is position at end of prompt
			const pos=stringWidth(grapheme.join(""));
			const tabStop=(pos/TabWidth)|0;
			const spaces = TabWidth - (pos % TabWidth);
			for (let i = 0; i < spaces; i++) {
				bytes.push(0x08);
			}
		}else{
			const width = stringWidth(lastChar) || 1;
			for (let i = 0; i <	 width; i++) {
				bytes.push(0x08, 0x20, 0x08);
			}
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

// a simple fallback for platforms with special needs
// > windows terminals :eyes:

// emoji wide char groups may need cludge for abnormal plungers
// unicode ranges currently featuring wide chars

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
const CSI_HOME=72;
const CSI_END=70;
const CSI_STATUS=48;
const CSI_EXT0=50;
const CSI_EXT1=51;
const CSI_EXT3=53;
const CSI_EXT4=54;

// 0x1b 0x5b
function onCSI(bytes,codes:number[]) {
	let n=3;
	const code=codes[2];
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
		case CSI_STATUS:
			console.log("[RAW] CSI status",codes);
			break;
		case CSI_HOME:
		case CSI_END:
			console.log("[RAW] CSI home end",codes[2]);
			break;
		case CSI_EXT0:
			if(codes[3]==50){
				console.log("[RAW] printer OK");
				n=4;
				break;
			}
		case CSI_EXT1:
		case CSI_EXT3:
		case CSI_EXT4:
			console.log("[RAW] CSI EXT ",codes[2],codes[3]);
			n=4;
			break;
		default:
			console.log("[RAW] CSI ? ",codes)
	}
	return n;
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

function harden(text:string,maxLength:number){
	let s = text.normalize("NFC");
	if (s.length > maxLength) s = s.slice(0, maxLength) + "\u2026";
	return s;
}

export async function writeMessage(message:string){
	await writer.write(encoder.encode(harden(message,8e6)));
	await writer.ready;
}

const prompt="]";

// slopPrompt
// returns a line of keyboard input while refreshing background tasks
// leaves raw mode on to fix Windows scroll issue
// fuzzy readPromise life time seems to work well allows read timeouts
let readPromise;
let counter=0;
const decoderStream=new TextDecoder("utf-8",{stream:true});

// [slop] sleep

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

export async function slopPrompt(message:string,interval:number,refreshHandler?:(num:number,msg:string)=>Promise<void>) {
	Deno.stdin.setRaw(true);
	let response={};
	if(message){
		await writer.write(encoder.encode(harden(message,1e6)));
		await writer.ready;
	}
	let busy=true;
	while(true){
		let bytes=[];
		if(!readPromise) readPromise=reader.read();
		let winner=null;
		while(true){
			const timerPromise=new Promise<null>(res => setTimeout(() => res(null), interval));
			const race=listenerPromise?[readPromise,timerPromise,listenerPromise]:[readPromise,timerPromise];
			if(receivePromise) race.push(receivePromise);
			winner = await Promise.race(race);
			if(winner==null){
				if(!busy) {
					const line=grapheme.join("").trimEnd();
					grapheme=[];
					response={line};
					history.push(line);
					break;
				}
				const line=grapheme.join("");
				await refreshHandler(counter++,prompt+line);
				continue;
			}
			break;
		}
		if(!winner) {
			break;// we break for break breaks, result has been loaded due to above timeout
		}
		const { value, done, connection, receive, source } = winner;
		if (connection) {
			slopConnection = connection;
			listenerPromise = listenPort(8081);
			receivePromise=readConnection(connection);
			continue;
		}
		if(receive){
			const messages=[];
			const n=receive.length;
			const text=rxDecoder.decode(receive);
			try{
				const blob=JSON.parse(text);
				if(blob.messages){
					for(const message of blob.messages){
						// todo: safeguard reckless behavior
						messages.push({message:message.message,from:message.from});					
					}
				}
			}catch(error){
				echo("JSON error",text,error);
			}
			if(messages){
				// we break for messages from discord
				response={messages};
				break;
			}
//			const source=receive.source;
			receivePromise=readConnection(source)
			continue;
		}
		readPromise=null;
		busy=true;
		if (done || !value) break;
		const n=value.length;
		for(let i=0;i<n;i++){
			const byte=value[i];
			const marker=byte&0xf8;
			if(marker==0xe0){// 3 byte unicode
				const v3=value.subarray(i,i+3);
				const utf=decoder.decode(v3);
				bytes.push(...encoder.encode(utf));
				addInput(utf);
				i+=2;
				continue;
			}
			if(marker==0xf0){// 4 byte unicode
				const v4=value.subarray(i,i+4);
				const utf=decoder.decode(v4);
				bytes.push(...encoder.encode(utf));
				addInput(utf);
				i+=3;
				continue;
			}
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
					if (value[1] === 0x5b) { // cursor and past handlers
						onCSI(bytes,value);
					}
				}
				break;
			} else if ((byte==0x0D) || (byte==0x0A)) { // Enter key
				bytes.push(0x0D,0x0A);
				busy=false;
			} else {
				if(byte<32){
					console.log("[RAW] bad byte",byte);
					break;
				}
//				if(byte>122){⛲
//				}
				const char = decoderStream.decode(new Uint8Array([byte]));
				if(!char){
					console.log("[RAW] not char from byte",byte);
					break;
				}
				bytes.push(...encoder.encode(char));
    		    addInput(char);
//				bytes.push(byte);
//				const char = decoderStream.decode(new Uint8Array([byte])); // Fix: Decode single byte to char
//				addInput(char);
				if (byte === 0x3A) { // Colon ':'
					const n=grapheme.length;
					if(inCode){
						if(n>codePos){
							const words=grapheme.slice(codePos, n - 1).join("");
							const lower=words.toLowerCase();
							if(lower in shortcode){
								const count=stringWidth(words)+2;
								const glyph=shortcode[lower]+"\uFE0F";
								replaceText(bytes,count,glyph);
								grapheme.push(glyph);
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
		if (bytes.length) {
			const rawBytes=new Uint8Array(bytes);
			await writer.write(rawBytes);
			await writer.ready;
		}
	}
	inCode=false;
	return response;
}
