// slopshop.ts - keeping .slop.ts workers busy
// (c)2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

// scans the slop folder for .slop.ts workers

// todo:
// frame multiple viewports
//

// const message=AnsiHome+frame+ansiPrompt()+AnsiPink+line+AnsiDefault;

const rawPrompt=true;

const exitMessage="Ending session.";

import { resolve } from "https://deno.land/std/path/mod.ts";
import { _common } from "https://deno.land/std@0.224.0/path/_common/common.ts";

import { echo, fileLength, Ansi } from "./slopshoptools.ts";


async function readFileNames(path:string,suffix:string):Promise<string[]>{
	const result=[];
	try {
		for await (const entry of Deno.readDir(path)) {
			if (entry.isFile && entry.name.endsWith(suffix)) {
				if(_verbose) echo("readFileNames",path,entry);
				result.push(entry.name);
			}
		}
	} catch (error) {
		echo("readFileNames:", error);
	}
	return result;
}

const appDir=Deno.cwd();
const slopPath=resolve(appDir,"../slop");

const _verbose=false;

// main action starts here

const slops:Worker[]=[];
const slopWorkers:any[]=[];

const slopFrames:string[]=[];
const slopnames=await readFileNames(slopPath,".slop.ts");
const slopEvents:Event[]=[];

console.log("[SHLOP] slop shop 0.2");
console.log("[SHLOP] serving slopnames");
console.log("[SHLOP]",slopnames);
console.log("[SHLOP] enter to start exit to end");

console.log(Ansi.HideCursor);

class Event{
	name: string;
	code: number[];
	constructor(name:string,code:number[]) {
		this.name=name;
		this.code=code;
	}
};

function onKey(value:number[]){
	const e=new Event("key",value);
	slopEvents.push(e);
}

let workerCount=0;
for(const name of slopnames){
	const id=workerCount++;
	const path=slopPath+"/"+name;
	const len=await fileLength(path);
	echo("[SHLOP] running slop",name,len);
	const url="file:///"+path;
	const worker=new Worker(url,{type: "module"});
	worker.onmessage = (message) => {
		echo("[SHLOP]",worker,message)
		const payload={...message.data};
		switch(payload.event){
			case "tick":
				if(payload.frame){
					slopFrames.push(payload.frame);
				}
				break;
			default:
				echo("[SHLOP]",name,payload);
				break;
		}
	}
	slops.push(worker);
	slopWorkers.push({id,name})
}

let slopPail:unknown[]=[];

function logSlop(_result:any){
	const message=JSON.stringify(_result);
	console.error("\t[SHLOP]",message);
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

let consoleSize=Deno.consoleSize();

function resetWorkers(){
	consoleSize=Deno.consoleSize();
	for(const key in slops){
		const worker=slops[key];
		const info=slopWorkers[key];
		console.log("[SHLOP] worker reset",info.name);
		worker.postMessage({command:"reset",consoleSize});
	}
}

function ansiPrompt(){
	const row=consoleSize.rows;
	return Ansi.Cursor + row + ";1H";// + AnsiBlankLine;
}


let slopFrame=0;
let slopEvent=0;
const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();
async function refreshBackground(pause:number,line:string) {
	await new Promise(resolve => setTimeout(resolve, pause));
	const events=flushEvents();
	if(events.length){
		// all slop workers get all events
		for(const worker of slops){
			console.log("[SHLOP] worker update");
			worker.postMessage({command:"update",events});
		}			
	}
	if(slopFrames.length&&slopFrame!=slopFrames.length){
		slopFrame=slopFrames.length;
		const frame=slopFrames[slopFrame-1];
//		const message=Ansi.Home + frame + Ansi.Cursor + row + ";1H\n" + prompt+line;
		const message=Ansi.Home+frame+ansiPrompt()+Ansi.Pink+line+Ansi.Default;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
}

// exitSlop 𓊽𓉴𓉴𓉴𓊽

function exitSlop(){
	console.log(Ansi.ShowCursor);
	Deno.stdin.setRaw(false);
	console.log("[SHLOP] exitSlop clearing raw",exitMessage);
}

// promptSlop 𓅠

let _promptBuffer=new Uint8Array(0);

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
		const line=decoder.decode(_promptBuffer);
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
					if (_promptBuffer.length > 0) {
						_promptBuffer=_promptBuffer.slice(0, -1);
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
					const line=decoder.decode(_promptBuffer);
					let n=line.length;
					if (n > 0) {
						_promptBuffer=_promptBuffer.slice(n);
					}
					result=line.trimEnd();
					echo("[stdin]",result);
					busy=false;
				} else if (byte==0x09){
					onKey([0]);
				} else {
					bytes.push(byte);
					const buf=new Uint8Array(_promptBuffer.length + 1);
					buf.set(_promptBuffer);
					buf[_promptBuffer.length]=byte;
					_promptBuffer=buf;
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

while(true){
	const input=await(promptSlop("]"));
	if(input=="exit") break;
	if(input==""){
		console.log("[SHLOP] reset");
		resetWorkers();
		continue;
	}
	console.log("[SHLOP] ",input);
}

console.log("oh no, bye");

exitSlop();
Deno.exit(0);

