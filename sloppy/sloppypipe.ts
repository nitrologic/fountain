// sloppylisten.ts - a sloppy ssh telnet server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

//import { Client } from "https://deno.land/x/ssh2@0.9.0/mod.ts";
import { readFileSync } from "node:fs";

import {wrapText,onSystem,readSystem,readFountain,writeFountain,disconnectFountain,connectFountain} from "./sloppyutils.ts";

const sockPath="/tmp/sloppy.sock";

const brandSloppyPipe="SloppyPipe";
const sloppypipeVersion="1.0.0";
const appDetails=brandSloppyPipe+" "+sloppypipeVersion+" @ "+sockPath;

console.log(appDetails);

async function readStream(connection) {
	const rid=connection.rid;
	const decoder = new TextDecoder();
	const session = connections[rid];
	if (!session) return;
	const buffer = new Uint8Array(1024);
	try {
		while (true) {
			const n = await connection.read(buffer);
			if (n === null) break; // EOF
			const text = decoder.decode(buffer.subarray(0, n));
			const lines = text.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed === 'exit') {
					await session.print('SloppyPipe Closed\r\n');
					delete connections[rid];
					return;
				}
				if (trimmed.length) {
					const blob = {messages: [{message: trimmed, from: 'pipe:' + rid}]};
					await writeFountain(JSON.stringify(blob) + '\n');
				}
			}
		}
	} catch (err) {
		console.error('Stream error:', err);
	} finally {
		delete connections[rid];
	}
}

class SocketSession{
	constructor(conn){
		this.encoder=new TextEncoder();
		this.connection=conn;
	}
	async read(){
		const connection=this.connection;
		return readStream(connection);
	}
	async print(text){
		const bytes=this.encoder.encode(text);
		// TODO: check partial writes
		await this.connection.write(bytes);
	}
};

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

const connections: Record<string, SocketSession> = {};

let slopPail:unknown[]=[];
let connectionCount=0;
let sessionCount=0;
let connectionClosed=0;

const greetings=[sloppyStyle,"Welcome to ",sloppyLogo,sloppyPipeVersion].join("");
const notice="type exit to quit";

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve,ms);});
}

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
		await writeSloppy(line, from);
	}
}

async function onConnection(connection) {
	const rid=connection.rid;
	const session = new SocketSession(connection);
	connections[rid]=session;
	connectionCount++;
	return session.read();

}

function startConnectionListener(server, resolve) {
	function listenerLoop() {
		(async function() {
			for await (const connection of server) {
				onConnection(connection);
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
//		console.log("[PIPE] race result",result);
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
