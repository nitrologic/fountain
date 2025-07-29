// slopshop.ts - keeping .slop.ts workers busy
// (c)2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

import { resolve } from "https://deno.land/std/path/mod.ts";

import { echo, fileLength, Ansi } from "./slopshoptools.ts";

// scans the slop folder for .slop.js workers *

// todo:

// frame multiple viewports
// const message=AnsiHome+frame+ansiPrompt()+AnsiPink+line+AnsiDefault;
// ts support via modular plugin
// smooth out clock ticks at both ends

const BackgroundPeriod=50;
const BackgroundDutyCycle=25;

const _verbose=false;
const rawPrompt=true;

const exitMessage="Ending session.";


async function readFileNames(path:string,suffix:string):Promise<string[]>{
	const result=[];
	try {
		for await (const entry of Deno.readDir(path)) {
			if (entry.isFile && entry.name.endsWith(suffix)) {
				if(_verbose) echo("[SHLOP] readFileNames",path,entry);
				result.push(entry.name);
			}
		}
	} catch (error) {
		echo("[SHLOP] readFileNames:", error);
	}
	return result;
}

const appDir=Deno.cwd();
const slopPath=resolve(appDir,"../slop");

// main action starts here

const slops:Worker[]=[];
const slopWorkers:any[]=[];

const slopFrames:string[]=[];
const slopnames=await readFileNames(slopPath,".slop.js");
const slopEvents:Event[]=[];

console.log("[SHLOP] slop shop 0.2");
console.log("[SHLOP] serving slopnames");
console.log("[SHLOP]",slopnames);
console.log("[SHLOP] enter to start type exit to end");

console.log(Ansi.HideCursor);

class Button{
	value=0;
	inc(){
		this.value++;
	}
}

class Lever{
	min=-1;
	max=1;
	value=0;
	constructor(){		
	}	
	inc(amount=1){
		this.value+=amount;
		if(this.value>this.max) this.value=this.max;
	}
	dec(amount=1){
		this.value-=amount;
		if(this.value<this.min) this.value=this.min;
	}
};

class Event{
	name: string;
	code: number[];
	constructor(name:string,code:number[]) {
		this.name=name;
		this.code=code;
	}
};

// [ 27 ] Escape
// [ 9 ] Tab

// 27, 91, 

// [ 65..68 ] Up Down Right Left
// [ 80..83 ] F1 F2 F3 F4
// [  49, 53, 126 ] F5
// [  49, 55, 126 ] F6
// [  49, 56, 126 ] F7
// [  49, 57, 126 ] F8
// [  50, 48, 126 ] F9
// [  50, 49, 126 ] F10
// [  50, 51, 126 ] F11
// [  50, 52, 126 ] F12

const joyx=new Lever();
const joyy=new Lever();
const joyb=new Button();

function resetJoy(){
	joyx.value=0;
	joyy.value=0;
	joyb.value=0;
}

function onKey(value:number[]){
	if(value.length==3 && value[0]==27 && value[1]==91){
		if(value[2]==65) joyy.dec();
		if(value[2]==66) joyy.inc();
		if(value[2]==67) joyx.inc();
		if(value[2]==68) joyx.dec();
	}
	if(value.length==1){
		if(value[0]===9) joyb.inc();
	}
	const joy=[joyx.value,joyy.value,joyb.value];
//	console.log("[SHLOP] event",joy);
	const e=new Event("joy",joy);
	slopEvents.push(e);
}

// receives payload frames in tick messages

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

function flushSlopEvents(){
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
	consoleSize.rows-=2;
	let count=0;
	for(const key in slops){
		const worker=slops[key];
		const info=slopWorkers[key];
		worker.postMessage({command:"reset",consoleSize});
		count++;
	}
	console.log("[SHLOP] workers reset",count);
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

	if(slopFrames.length&&slopFrame!=slopFrames.length){
//		slopFrame=slopFrames.length;
//		const frame=slopFrames[slopFrame-1];
		const frame=slopFrames[slopFrame++];
// Ansi.Clear does not help scroll buffer issue, Ansi.Reset does in vscode...
		const message=Ansi.Reset+Ansi.Defaults+Ansi.Home+frame+Ansi.Defaults+ansiPrompt()+Ansi.Pink+line;
		await writer.write(encoder.encode(message));
		await writer.ready;
	}

	await new Promise(resolve => setTimeout(resolve, pause));
	const events=flushSlopEvents();

	const e=new Event("refresh",[slopFrame]);
	events.push(e);

	if(events.length){
		// all slop workers get all events
		for(const worker of slops){
//			console.log("[SHLOP] worker update");
			worker.postMessage({command:"update",events});
		}			
	}
}

function exitSlop(){
	console.log(Ansi.ShowCursor);
	Deno.stdin.setRaw(false);
	console.log("[SHLOP] exitSlop clearing raw",exitMessage);
}

let _promptBuffer=new Uint8Array(0);

async function promptSlop(message:string) {
	if(!rawPrompt){
		const response=await prompt(message);
		return response;
	}
	let result="";
	if(message){
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
	Deno.stdin.setRaw(true);
	// TODO: document me
	const timer = setInterval(async() => {
		const line=decoder.decode(_promptBuffer);
		await refreshBackground(BackgroundDutyCycle,message+line);
	}, BackgroundPeriod);
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
//						onKey(27);
					}
					onKey(value);
					if (value.length === 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							echo("[SHLOP] F1");
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
					echo("[SHLOP] stdin",result);
					busy=false;
				} else if (byte==0x09){
					onKey(value);
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
		resetJoy();
		continue;
	}
	console.log("[SHLOP] ",input);
}

console.log("oh no, bye");

exitSlop();
Deno.exit(0);

