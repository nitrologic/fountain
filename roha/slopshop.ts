// slopshop.ts - keeping .slop.ts workers busy
// (c)2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

// latest : rawkey code from slopprompt 

import { slopPrompt, rawPrompt, writeMessage } from "./slopprompt.ts";
import { echo, fileLength, Ansi } from "./slopshoptools.ts";

import { resolve } from "https://deno.land/std/path/mod.ts";

// scans the slop folder for .slop.js workers *

const BackgroundPeriod=200;
const BackgroundDutyCycle=25;

const _verbose=false;
const _rawPrompt=true;

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

console.log("[SHLOP] slop shop 0.3");
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

async function refreshSlop(pause:number,line:string) {
	if(slopFrames.length&&slopFrame!=slopFrames.length){
		const frame=slopFrames[slopFrame++];
		const message=Ansi.Reset+Ansi.Defaults+Ansi.Home+frame+Ansi.Defaults+ansiPrompt()+Ansi.Aqua+line;
		writeMessage(message);
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

async function promptSlop(message:string) {
	if(!_rawPrompt){
		const response=await prompt(message);
		return response;
	}
	const result=await slopPrompt(message,BackgroundDutyCycle,refreshSlop);
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
	if(input===null){
		break;
	}
	console.log("[SHLOP] ",input);
}

console.log("[SHLOP] oh no, bye");

exitSlop();
Deno.exit(0);
