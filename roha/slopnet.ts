// slopnet.ts - a telnet server for Slop Fountain
// Copyright (c) 2025 Simon Armstrong

// Licensed under the MIT License - See LICENSE file

const slopnetVersion=0.1;

let slopPail: unknown[] = [];

let sessionCount = 0;
let connectionCount = 0;
let connectionClosed = 0;

const greetings = "welcome to slopnet "+slopnetVersion+" shutdown to quit";

function logSlop(_result: any) {
	const message = JSON.stringify(_result);
	console.error("\t[SLOPNET]", message);
	slopPail.push(message);
}

async function sleep(ms: number) {
	await new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// slopfountain connection

// Creating a basic worker (main.ts)
let worker:Worker = new Worker(new URL("./slophole.ts", import.meta.url).href, {type: "module"});

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

// Telnet server

async function startTelnetServer(port: number = 8081) {
	const listener = Deno.listen({ hostname: "localhost", port, transport: "tcp" });
	logSlop({status:"Listening for Telnet",port});
	for await (const conn of listener) {
		++connectionCount;
		logSlop({ status: "New connection opened", connectionCount });
		handleTelnetConnection(conn).catch((err) => {
			logSlop({ error: "Connection error: ${err.message}", connectionCount });
		});
	}
}

async function handleTelnetConnection(conn: Deno.Conn) {
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

startTelnetServer();
