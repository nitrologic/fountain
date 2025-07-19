// slop.ts - skeleton code for serving slop
// (c)2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

console.log("[SLOP] skeleton code says hello");

Deno.exit(0);

/*
Deno.serve((request) => {
    const r=JSON.stringify(request);
    return new Response("Slop Fountain:"+r);
});

*/

// slopsite snapshot for worker refs

/*
import { resolve } from "https://deno.land/std/path/mod.ts";
import { _common } from "https://deno.land/std@0.224.0/path/_common/common.ts";

let verbose=false;

const rawPrompt=true;

let outputBuffer=[];
let printBuffer=[];
let markdownBuffer=[];

const exitMessage="Ending session.";

const AnsiDefault="\x1B[39m";
const AnsiPink="\x1B[38;5;206m";
const AnsiBlankLine="\x1B[0K";
const AnsiClear="\x1B[2J";
const AnsiHome="\x1B[H";
const AnsiCursor="\x1B[";

const AnsiMouseOn="\x1B[?1003h\x1B[?1015h\x1B[?1006h";
const AnsiMouseOff="\x1B[?1000l";

let consoleSize=Deno.consoleSize();

function AnsiPrompt(){
	const row=consoleSize.rows;
	return AnsiCursor + row + ";1H";// + AnsiBlankLine;
}

function toString(arg:any):string{
	if (typeof arg === 'object') {
		return JSON.stringify(arg);
	}
	return String(arg);
}

async function fileLength(path) {
	const stat=await Deno.stat(path);
	return stat.size;
}

function echo(...args:any[]){
//	const args=arguments.length?Array.from(arguments):[];
	const lines=[];
	for(const arg of args){
		const line=toString(arg);
		lines.push(line);
	}
	outputBuffer.push(lines.join(" "));
}

async function readFileNames(path:string,suffix:string){
	const result=[];
	try {
	for await (const entry of Deno.readDir(path)) {
		if (entry.isFile && entry.name.endsWith(suffix)) {
			if(verbose) echo("readFileNames",path,entry);
			result.push(entry.name);
		}
	}
	} catch (error) {
		echo("readFileNames:", error);
	}
	return result;
}

class Event{
	name: string;
	code: number[];
	constructor(name:string,code:number[]) {
		this.name=name;
		this.code=code;
	}
};

const appDir=Deno.cwd();
const slopPath=resolve(appDir,"../slop");

const slops:Worker[]=[];
const slopFrames:string[]=[];
const slopnames=await readFileNames(slopPath,".slop.ts");
const slopEvents:Event[]=[];

function onKey(value:number[]){
	const e=new Event("key",value);
	slopEvents.push(e);
}

function resetWorkers(){
	consoleSize=Deno.consoleSize();
	for(const worker of slops){
		console.log("[SLOP] worker reset");
		worker.postMessage({command:"reset",consoleSize});
	}
}

for(const name of slopnames){
	const path=slopPath+"/"+name;
	const len=await fileLength(path);
	echo("[SLOP] running slop",name,len);
	const url="file:///"+path;
	const worker=new Worker(url,{type: "module"});
	worker.onmessage = (message) => {
		const payload={...message.data};
		switch(payload.event){
			case "tick":
				if(payload.frame){
					slopFrames.push(payload.frame);
				}
				break;
			default:
				echo("[SLOP]",name,payload);
				break;
		}
	}
	slops.push(worker);
}

let slopPail:unknown[]=[];

function logSlop(_result:any){
	const message=JSON.stringify(_result);
	console.error("\t[slop]",message);
	slopPail.push(message);
}


async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

function flushEvents(){
	const events:Event[]=[];
	if(slopEvents.length&&slopEvent<slopEvents.length){
		while(slopEvent<slopEvents.length){
			const _event:Event=slopEvents[slopEvent++];
			events.push(_event);
		}
	}
	return events;	
}

const decoder=new TextDecoder("utf-8");
const encoder=new TextEncoder();

let promptBuffer=new Uint8Array(0);
let slopFrame=0;
let slopEvent=0;
const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();
async function refreshBackground(pause:number,line:string) {
	await new Promise(resolve => setTimeout(resolve, pause));
	const events=flushEvents();
	if(events.length){
		console.log("[SLOP] workers update",JSON.stringify(events));
		for(const worker of slops){
			worker.postMessage({command:"update",events});
		}			
	}
	if(slopFrames.length&&slopFrame!=slopFrames.length){
		slopFrame=slopFrames.length;
		const frame=slopFrames[slopFrame-1];
//		const message=AnsiHome + frame + AnsiCursor + row + ";1H\n" + prompt+line;
		const message=AnsiHome+frame+AnsiPrompt()+AnsiPink+line+AnsiDefault;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
}

// exitSlop 𓊽𓉴𓉴𓉴𓊽

function exitSlop(){
	Deno.stdin.setRaw(false);
	console.log("exitSlop",exitMessage);
}

// promptSlop 𓅠

async function promptSlop(message:string) {
	if(!rawPrompt) {
		const response=await prompt(message);
		return response;
	}
	let result="";
	if(message){
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
	Deno.stdin.setRaw(true);
	const timer = setInterval(async() => {
		const line=decoder.decode(promptBuffer);
		await refreshBackground(5,message+line);
	}, 100);
	let busy=true;
	while (busy) {
		try {
//			const timeout = setTimeout(() => {refreshBackground(5)}, 1000); // 5-second timeout
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
						exitSlop();
						Deno.exit(0);
					}
					onKey(value);
					if (value.length === 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							echo("F1");
						}
					}
					break;
				} else if (byte === 0x0A || byte === 0x0D) { // Enter key
					bytes.push(0x0D, 0x0A);
					const line=decoder.decode(promptBuffer);
					let n=line.length;
					if (n > 0) {
						promptBuffer=promptBuffer.slice(n);
					}
					result=line.trimEnd();
					echo("[stdin]",result);
					busy=false;
				} else if (byte==0x09){
					onKey([0]);
				} else {
					bytes.push(byte);
					const buf=new Uint8Array(promptBuffer.length + 1);
					buf.set(promptBuffer);
					buf[promptBuffer.length]=byte;
					promptBuffer=buf;
				}
			}
			if (bytes.length) await writer.write(new Uint8Array(bytes));
		}catch(error){
			console.error("Prompt error:", error);
			busy=false;
		}
	}
	clearInterval(timer);
	Deno.stdin.setRaw(false);
	return result;
}

console.log("slop 0.1 mouse is on"+AnsiMouseOn);

while(true){
	const input=await(promptSlop(">"));
	if(input=="exit") break;
	if(input==""){
		console.log("[SLOP] reset");
		resetWorkers();
		continue;
	}
	console.log("[SLOP] ",input);
}


console.log("oh no, bye, mouse off");
console.log(AnsiMouseOff);

exitSlop();
Deno.exit(0);
*/