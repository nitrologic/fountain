// sloppynet.ts - a sloppy server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

import { Client, Server } from "npm:ssh2";
import { onSystem, onFountain, readSystem, readFountain, writeFountain, disconnectFountain, connectFountain } from "./sloppyutils.ts";

// sloppyNet uses slopfeed workers in a responsible manner

const sloppyNetVersion=0.2;

let slopPail: unknown[] = [];

let sessionCount = 0;
let connectionCount = 0;
let connectionClosed = 0;

const sloppyLogo="🐟🐟 🐟sloppy net"

const greetings = "welcome to "+sloppyLogo+" "+sloppyNetVersion+" shutdown to quit";

function logSlop(_result: any) {
	const message = JSON.stringify(_result);
	console.error("\t[SLOPPYNET]", message);
	slopPail.push(message);
}

async function sleep(ms: number) {
	await new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// slopfountain connection

// Creating a basic worker (main.ts)
let worker:Worker = new Worker(new URL("./slopfeed.ts", import.meta.url).href, {type: "module"});

function closeSlopHole(){
	worker.postMessage({ command: "close" });
}

function writeSlopHole(content:string){
	worker.postMessage({ command: "write", data:{slop:[content]} });
}

function readSlopHole(){
	worker.postMessage({ command: "read", data:{} });
}

worker.onmessage = (message) => {
	const payload=message.data;//ports,origin.lastEventId JSON.stringify(payload)
	logSlop(payload);
	if(payload.connected){
		writeSlopHole(greetings);
		readSlopHole();
//		worker.postMessage({ command: "write", data:greet });
	}
	if(payload.disconnected){
		worker.terminate(); // Stop the worker when done
		worker=null;
	}
	if(payload.received){
		const rx=payload.received;
		logSlop(rx);
	}
};

worker.onerror = (e) => {
	console.error("Worker error:", e.message);
};

await sleep(6e3);

worker.postMessage({ command: "open", data: [1, 2, 3, 4] });

// sloppy server

const sshClient=new Client();

async function startSloppyServer(port: number = 22) {
	const server = new Server({
		hostKeys: [/* Load your private host key here, e.g., from Deno.readFile() */],
	});

	server.on('connection', (sshClient) => {
		++connectionCount;
		logSlop({ status: "New SSH connection opened", connectionCount });
		handleSloppySSHConnection(sshClient).catch((err) => {
			logSlop({ error: `Connection error: ${err.message}`, connectionCount });
		});
	});

	await new Promise((resolve) => server.listen(port, "localhost", () => resolve()));
	logSlop({ status: "SSH server listening", port });
}

async function handleSloppySSHConnection(client: any) {
	client.on('authentication', (ctx: any) => {
		// Accept any auth for simplicity (add real checks later)
		ctx.accept();
	});

	client.on('ready', () => {
		client.on('session', (accept: any, reject: any) => {
			const session = accept();
			session.on('pty', (accept: any, reject: any, info: any) => {
				accept();
			});
			session.on('shell', (accept: any, reject: any) => {
				const stream = accept();
				const encoder = new TextEncoder();
				let input = '';

				stream.write(encoder.encode(`${greetings}\r\n> `));
				logSlop({ greetings, connectionCount });

				stream.on('data', (data: Buffer) => {
					const chunk = data.toString();
					input += chunk;

					// Process complete lines
					const lines = input.split('\r\n');
					input = lines.pop() || '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						let response: string;
						if (trimmed === "shutdown") {
							Deno.exit(0);
						}
						if (trimmed === "exit") {
							response = "Goodbye";
							stream.end(encoder.encode(`${response}\r\n`));
							--connectionCount;
							logSlop({ status: "Connection closed", connectionCount });
							client.end();
							return;
						} else if (trimmed.startsWith("/")) {
							response = handleCommand(trimmed);
						} else {
							response = `Echo: ${trimmed}`;
						}

						logSlop({ input: trimmed, output: response, connectionCount });
						stream.write(encoder.encode(`${response}\r\n> `));
					}
				});

				stream.on('close', () => {
					--connectionCount;
					logSlop({ status: "Connection closed", connectionCount });
					client.end();
				});
			});
		});
	});
}

async function startSloppyTelnetServer(port: number = 8082) {
	const listener = Deno.listen({ hostname: "localhost", port, transport: "tcp" });
	logSlop({status:"Listening for Slop",port});
	for await (const conn of listener) {
		++connectionCount;
		logSlop({ status: "New connection opened", connectionCount });
		handleSloppyConnection(conn).catch((err) => {
			logSlop({ error: "Connection error: ${err.message}", connectionCount });
		});
	}
}

async function handleSloppyConnection(conn: Deno.Conn) {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	const buffer = new Uint8Array(1024);
	let input = "";
	await conn.write(encoder.encode(greetings));
	logSlop({ greetings, connectionCount });
	while (true) {
		const n = await conn.read(buffer);
		if (n === null) break; // Connection closed

		const data = decoder.decode(buffer.subarray(0, n));
		input += data;

		// Process complete lines (Telnet uses \r\n)
		const lines = input.split("\r\n");
		input = lines.pop() || ""; // Keep incomplete line

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			let response: string;
			if (trimmed == "shutdown"){
				Deno.exit(0);
			}
			if (trimmed === "exit") {
				response = "Goodbye";
				logSlop({ input: trimmed, output: response, connectionCount });
				await conn.write(encoder.encode("${response}\r\n"));
				conn.close();
				--connectionCount;
				logSlop({ status: "Connection closed", connectionCount });
				return;
			} else if (trimmed.startsWith("/")) {
				response = handleCommand(trimmed);
			} else {
				response = "Echo: ${trimmed}";
			}

			logSlop({ input: trimmed, output: response, connectionCount });
			await conn.write(encoder.encode("${response}\r\n> "));
		}
	}

	conn.close();
	--connectionCount;
	logSlop({ status: "Connection closed", connectionCount });
}

function handleCommand(line: string): string {
	const command = line.substring(1).trim().toLowerCase();
	switch (command) {
		case "help":
			return "Available commands: /help, /info, /push /exit /shutdown";
		case "info":{
				const info = {
					hostName: Deno.hostname(),
					userName: Deno.env.get("USERNAME") || "root",
					platform: (Deno.uid() || "Windows") + " " + Deno.osRelease(),
					session: "slop${Deno.pid}.${++sessionCount}",
					connectionCount
				};
				return JSON.stringify(info);
			}
		case "push":
			return "Pushed to slopPail";
		default:
			return "Unknown command: ${command}";
	}
}

startSloppyServer();

await connectFountain();
writeFountain("{\"action\":\"connect\"}");
let portPromise=readFountain();
let systemPromise=readSystem();
while(true){
	const race=[portPromise,systemPromise];
	const result=await Promise.race(race);
	if (result==null) break;
	if(result.system) {
		await onSystem(result.system);
		systemPromise=readSystem();
	}
	if(result.message) {
		await onFountain(result.message);
		portPromise=readFountain();
	}
//	echo("result",result);
	await(sleep(500));
}

console.log("[SLOPPYNET] bye");
disconnectFountain();
Deno.exit(0);
