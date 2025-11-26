// sloppylisten.ts - a sloppy ssh telnet server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

//import { Client } from "https://deno.land/x/ssh2@0.9.0/mod.ts";
import { readFileSync } from "node:fs";

import {wrapText,onSystem,readSystem,readFountain,writeFountain,disconnectFountain,connectFountain} from "./sloppyutils.ts";

const sockPath="/tmp/sloppy4.sock";

export const ANSI={
	Reset:"\x1BC",
	Defaults:"\x1B[0m",//"\x1B[39;49m",//\x1B[0m",
	Clear:"\x1B[2J",
	Home:"\x1B[H",
	White:"\x1B[37m",
	NavyBackground:"\x1b[48;5;24m",
	Aqua:"\x1B[38;5;122m",
	Pink:"\x1B[38;5;206m",
	HideCursor:"\x1b[?25l",
	ShowCursor:"\x1b[?25h",
	Cursor:"\x1B["//+ row + ";1H"
}

const sloppyStyle=ANSI.NavyBackground+ANSI.White+ANSI.Clear;

const sloppyLogo="✴ slopcity";
const sloppyPipeVersion=0.8;

// raw key handling work in progress
// ssh-keygen -t rsa -f hostkey_rsa -N ''.

// TODO: make multi planetary
const HomeDir=Deno.env.get("HOME")||Deno.env.get("HOMEPATH");

//const rsaPath=HomeDir+"/.ssh/id_rsa";
//const rsaPath=HomeDir+"/fountain_key_skidnz"
// sloppyNet uses slopfeed workers in a responsible manner

const connections={};
const users={};

let slopPail:unknown[]=[];
let connectionCount=0;
let sessionCount=0;
let connectionClosed=0;

const greetings=[sloppyStyle,"Welcome to ",sloppyLogo,sloppyPipeVersion].join("");
const notice="type exit to quit";

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve,ms);});
}

const encoder=new TextEncoder();
async function writeSloppy(message:string,from:string){
	const text="["+from+"] "+message+"\r\n";
	for(const key of Object.keys(connections)){
		const session=connections[key];
		await session.print(text);
	}
}

export async function onFountainPipe(message:string){
	const blob=JSON.parse(message);
	for(const message of blob.messages){
		const line=message.message||message.content||"[BLANK]";
		const from=message.from;
		console.log("["+from+"] "+line);
	}
}

function onConnection(conn) {
    connections[conn.rid] = createSession(conn.w);
    connectionCount++;
    writeGreeting(conn.w);
    processClientStream(conn.r, conn.rid);
}

function startConnectionListener(server, resolve) {
    function listenerLoop() {
        (async function() {
            for await (const conn of server) {
                onConnection(conn);
                resolve(conn);
                break;
            }
        })();
    }
    listenerLoop();
}

let sloppySocket=null;

function openSloppyPipe() {
	// assert sloppySocket is null
	sloppySocket = Deno.listen({transport: "unix", path: sockPath});
	return new Promise(function(resolve) {
		startConnectionListener(sloppySocket, resolve);
	});
}

function closeSloppyPipe(){
	if(sloppySocket){
		sloppySocket.close();
		sloppySocket=null;
	}
}

try {
	await connectFountain();
	await writeFountain('{"action":"connect"}');
	let portPromise=readFountain();
	let systemPromise=readSystem();
	let pipePromise=openSloppyPipe();

	while(true){
		const race=[portPromise,systemPromise,pipePromise];
		const result=await Promise.race(race);
		if (result == null) break;
		console.log("[PIPE] race result",result);
		if(result.system) {
			await onSystem(result.system);
			systemPromise=readSystem();
		}
		if(result.message) {
			await onFountainPipe(result.message);
			portPromise=readFountain();
		}
		await sleep(500);
	}
} catch (error) {
	console.error("Error in main loop:",error);
} finally {
	console.log("[PIPE] bye");
	disconnectFountain();
	closeSloppyPipe();
	Deno.exit(0);
}
