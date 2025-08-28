// sloppynet.ts - a sloppy server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

// ssh-keygen -t rsa -f hostkey_rsa -N ''.

import { Client, Server } from "npm:ssh2";
import { readFileSync } from "node:fs";

import {onSystem,readSystem,readFountain,writeFountain,disconnectFountain,connectFountain} from "./sloppyutils.ts";

const sloppyLogo="✴ slopspace";
const sloppyNetVersion=0.4;

// TODO: make multi planetary

const rsaPath="C:/Users/nitro/.ssh/id_rsa";

// sloppyNet uses slopfeed workers in a responsible manner

const sshClient=new Client();
const sshStreams=[]; // {stream,from}

let slopPail:unknown[]=[];

let sessionCount=0;
let connectionCount=0;
let connectionClosed=0;

const greetings=["Welcome to",sloppyLogo,sloppyNetVersion,"shutdown to quit"].join();

function logSlop(_result:any) {
	const message=JSON.stringify(_result);
	console.error("\t[SLOPPYNET]",message);
	slopPail.push(message);
}

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve,ms);});
}

async function writeSloppy(message:string,from:string){
	const text="["+from+"] "+message+"\r\n";
	console.log("[SLOP]",text);
	for(const {stream,name} of sshStreams){
		await stream.write(text);
	}
}

let lineBuffer="";

async function onShell(data: Buffer, stream: any, name:string) {
	for (const byte of data) {
		const char = String.fromCharCode(byte);
		if (char === "\n" || char === "\r") {
			if (lineBuffer === "exit") {
				stream.end("Goodbye!\r\n");
				sshClient.end();
				return;
			}
			if (lineBuffer) {
				const line=lineBuffer;
				lineBuffer = "";
				stream.write("\r\n");
				if(!line.startsWith("/")){
					const packet="messages:"
					await writeFountain(line);
					const blob={messages:[{message:line,from:name}]};
					await writeFountain(JSON.stringify(blob,null,0));
				}
			}
		} else {
			// Accumulate non-newline characters
			lineBuffer += char;
			stream.write(char);
		}
	}
}

export async function onFountain(message:string){
	const line=message;
	if(line.startsWith("/announce ")){
		const message=line.substring(10);
		await writeSloppy(message,"fountain");
	}
	if(line.startsWith("{")||line.startsWith("[")){
		try{
			let cursor=0;
			while(cursor<line.length){
				const delim=line.indexOf("}\t{",cursor);// less than healthy
				const json=(delim==-1)?line.substring(cursor):line.substring(cursor,delim+1);
				cursor+=json.length;
				const payload=JSON.parse(json);
				for(const {message,from} of payload.messages){
					await writeSloppy(message,from);
				}
			}
		}catch(error){
			console.log("JSON parse error",error);
			console.log("JSON parse error",line);
		}
	}else{
		console.log("non json line",line);
	}
}

// slopfountain connection

// Creating a basic worker (main.ts)
let worker:Worker | null=new Worker(new URL("./slopfeed.ts",import.meta.url).href,{type:"module"});

function closeSlopHole(){
	if (worker) {
		worker.postMessage({command:"close"});
	}
}

function writeSlopHole(content:string){
	if (worker) {
		worker.postMessage({command:"write",data:{slop:[content]}});
	}
}

function readSlopHole(){
	if (worker) {
		worker.postMessage({command:"read",data:{}});
	}
}

if (worker) {
	worker.onmessage=(message) => {
		const payload=message.data;
		logSlop(payload);
		if(payload.connected){
			writeSlopHole(greetings);
			readSlopHole();
		}
		if(payload.disconnected){
			if (worker) {
				worker.terminate();
				worker=null;
			}
		}
		if(payload.received){
			const rx=payload.received;
			logSlop(rx);
 			onReceive(rx);
		}
	};

	worker.onerror=(e) => {
		console.error("Worker error:",e.message);
	};
}

await sleep(6e3);

if (worker) {
	worker.postMessage({command:"open",data:[5,6,7,8]});
}

// sloppy server

async function onSSHConnection(sshClient: any, name:string) {

	sshClient.on("authentication", (ctx: any) => {
		if (ctx.method === "password") {
			// if (ctx.username!="nitro") ctx.reject();
			ctx.accept();
		} else {
			ctx.reject(); // Reject other authentication methods
		}
	});

	sshClient.on("ready", () => {
		logSlop({ status: "SSH client authenticated" });
		sshClient.on("session", (accept: any, reject: any) => {
			const session = accept();
			session.on("pty", (accept: any) => accept && accept());
			session.on("shell", (accept: any) => {
				const stream = accept();
				sshStreams.push({stream,name});
				stream.write(greetings+"\r\n");
				stream.on("data", (data: Buffer) => {
					onShell(data,stream,name);
				});
			});
		});
	});

	sshClient.on("error", (err: any) => {
		logSlop({ error: "SSH client error", message: err.message });
	});

	sshClient.on("end", () => {
		logSlop({ status: "SSH connection closed" });
	});
}

async function startSSHServer(port: number = 22) {
	try {
		const hostKey = readFileSync(rsaPath, "utf8");
		const server = new Server({ hostKeys: [hostKey] });
		server.on("connection", (sshClient) => {
			const name="com"+(++connectionCount);
			logSlop({ status: "New SSH connection opened", connectionCount });
			onSSHConnection(sshClient,name).catch((err) => {
				logSlop({ error: "Connection error", message: err.message, connectionCount });
			});
		});
		await new Promise((resolve) => server.listen(port, "localhost", () => resolve(undefined)));
		logSlop({ status: "SSH server listening", port });
	} catch (error) {
		console.error("Failed to start SSH server:", error);
	}
}

startSSHServer();

try {
	await connectFountain();
	writeFountain('{"action":"connect"}');
	let portPromise=readFountain();
	let systemPromise=readSystem();

	while(true){
		const race=[portPromise,systemPromise];
		const result=await Promise.race(race);
		if (result == null) break;

		if(result.system) {
			await onSystem(result.system);
			systemPromise=readSystem();
		}
		if(result.message) {
			await onFountain(result.message);
			portPromise=readFountain();
		}
		await sleep(500);
	}
} catch (error) {
	console.error("Error in main loop:",error);
} finally {
	console.log("bye");
	disconnectFountain();
	Deno.exit(0);
}
