// sloppynet.ts - a sloppy server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

import { Client, Server } from "npm:ssh2";
import { readFileSync } from "node:fs";

import {onSystem,readSystem,readFountain,writeFountain,disconnectFountain,connectFountain} from "./sloppyutils.ts";

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

// white on teal
//\x1b[H
//const sloppyStyle="\x1b[48;5;24m\x1b[37m\x1b[2J";

const sloppyStyle=ANSI.NavyBackground+ANSI.White+ANSI.Clear;

const sloppyLogo="✴ slopspace";
const sloppyNetVersion=0.5;

// raw key handling work in progress
// ssh-keygen -t rsa -f hostkey_rsa -N ''.

// TODO: make multi planetary
const rsaPath="C:/Users/nitro/.ssh/id_rsa";

// sloppyNet uses slopfeed workers in a responsible manner

const sshClient=new Client();
const connections={};

let slopPail:unknown[]=[];

let sessionCount=0;
let connectionCount=0;
let connectionClosed=0;

const greetings=[sloppyStyle,"Welcome to ",sloppyLogo,sloppyNetVersion].join("");
const notice="type exit to quit";

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
//	console.log("[SLOP]",text.trim());
	for(const key of Object.keys(connections)){
		const session=connections[key];
		const stream=session.stream;
		// todo multiple calls here?
		await stream?.write(text);
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

class SSHSession {
	name: string;
	stream: any;
	env:Record<string,string>;
	private lineBuffer: string;
	private terminalSize: { cols: number; rows: number } | null;
	private decoder=new TextDecoder();

	constructor(name: string) {
		this.env={};
		this.name = name;
		this.lineBuffer = "";
		this.terminalSize = null;
	}

	setEnv(key:string,value:string){
		this.env[key]=value;
	}

	async write(data: string): Promise<void> {
		if (this.stream&&this.stream.writable) {
			await this.stream.write(data);
		}
	}
	async onEnd(): Promise<void> {
		if (this.stream) {
			await this.stream.end();
		}
	}

	getTerminalSize(): { cols: number; rows: number } | null {
		return this.terminalSize;
	}

	setTerminalSize(cols: number, rows: number): void {
		this.terminalSize = { cols, rows };
		logSlop({ status: "Terminal size updated", name: this.name, terminalSize: this.terminalSize });
	}

	async onEnter(){
		if (this.lineBuffer === "exit") {
			await this.write("Goodbye!\r\n");
			this.stream?.end();
		}
		if (this.lineBuffer === "/termsize") {
			if (this.terminalSize) {
				await this.write(`Terminal size: ${this.terminalSize.cols} columns x ${this.terminalSize.rows} rows\r\n`);
			} else {
				await this.write("Terminal size not available\r\n");
			}
			this.lineBuffer = "";
			await this.write("\r\n");
		}
		if (this.lineBuffer) {
			const line = this.lineBuffer;
			this.lineBuffer = "";
			await this.write("\r\n");
			if (!line.startsWith("/")) {
				const from=this.name;
				const message=line;//JSON.stringify(line);
				const blob={messages:[{message,from}]};
				const json=JSON.stringify(blob, null, 0);
				await writeFountain(json);
			}
		}
	}

//		console.log("onShell data:", Array.from(data).join(","));
	async onShell(data: Buffer): Promise<void> {
		const text=this.decoder.decode(data);
		for (const char of text) {
			const byte=char.charCodeAt(0);
			switch(byte){
				case 3:
					this.lineBuffer="";
					this.stream?.end();
					break;
				case 8:
				case 127:
					this.lineBuffer=this.lineBuffer.substring(0,-1);
					await this.write("\b \b");
					break;
				case 13:
				case 10:
					await this.onEnter();
					break;
				default:
					const printable=(byte==9)||(byte>=32);
					if(printable){
						this.lineBuffer += char;
						await this.write(char);
					}
			}
		}
	}

	end(): void {
		delete connections[this.name];
		logSlop({ status: "Session closed", name: this.name });
	}
}

async function onSSHConnection(sshClient: any, name: string) {
	sshClient.on("authentication", (ctx: any) => {
		if (ctx.method === "password") {
			ctx.accept();
		} else {
			ctx.reject();
		}
	});

	sshClient.on("ready", () => {
		const connection = new SSHSession(name);
		logSlop({ status: "SSH client authenticated", name });
		connections[name]=connection;
		// TODO: env signal exec sftp x11 subsystem

		sshClient.on("session", (accept: any, reject: any) => {
			const session = accept();
			session.on("shell", (accept: any) => {
				const stream = accept && accept();
				stream.write(greetings + "\r\n");
				stream.write(notice + "\r\n");
				stream.on("data", (data: Buffer) => {connection.onShell(data);});
				stream.on("end", () => {connection.end();});
				connection.stream=stream;
			});
			session.on("pty", (accept: any, reject: any, info: any) => {
				accept && accept();
				const { cols, rows } = info;
				connection.setTerminalSize(cols, rows);
			});

			session.on("signal", (accept: any, reject: any, info: any) => {
				accept && accept();
				const { name } = info;
				logSlop({ status: "Signal received", name: connection.name, signal: name });
				if (name === "INT") {
					connection.lineBuffer = "";
					connection.write("\r\nInterrupted\r\n");
				} else if (name === "TERM") {
					connection.write("\r\nTerminated\r\n");
					connection.stream?.end();
				}
			});

			session.on("env", (accept: any, reject: any, info: any) => {
				accept && accept();
				const {key,value}=info;
				connection.setEnv(key,value);
			});
			session.on("window-change", (accept: any, reject: any, info: any) => {
				accept && accept();
				const { cols, rows } = info;
				connection.setTerminalSize(cols, rows);
			});
		});
	});

	sshClient.on("error", (err: any) => {
		logSlop({ error: "SSH client error", message: err.message });
	});

	sshClient.on("end", () => {
		logSlop({status:"SSH ending connection",name});
		const connection=connections[name];
		connection?.end();
	});
}

async function startSSHServer(port: number = 22) {
	try {
		const hostKey = readFileSync(rsaPath, "utf8");
		const server = new Server({ hostKeys: [hostKey] });
		server.on("connection", (sshClient) => {
			const name="guest"+(++connectionCount);
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
	await writeFountain('{"action":"connect"}');
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
