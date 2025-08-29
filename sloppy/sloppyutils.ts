// sloppyutils.ts - refactor fuckups
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

// receive message from fountain /announce and echo to discord bot
// keep json flat single line

const sloppyBanner="[SLOPPY] slopchat discord bot by Simon 0.03";

const quotes=[
	"🤖 I am sloppy the janitor",
	"did thing thing call for a plunge? 🪠",
	"frump system prompt you say?"
];

// discord channel send

let quoteCount=0;
let openChannel="398589365846278144";

async function writeSloppy(message:string,from:string){
	if(openChannel){
		const channel = await client.channels.fetch(openChannel);
		if (channel?.isTextBased()) {
			await channel.send("["+from+"] "+message);
		}
	}
}

// TODO: add {messages:[{message,from}]} support
/*
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
			echo("JSON parse error",error);
			echo("JSON parse error",line);
		}
	}
}
*/
// system stdin support for sloppies

const systemDecoder = new TextDecoder();
export async function onSystem(rx:Uint8Array){
	const message:string=systemDecoder.decode(rx);
	const lines=message.split("\r\n");
	lines.pop();//ignore the incomplete
	for(const line of lines){
		console.log("[STDIO]",line);
		if(line=="exit") Deno.exit(0);
		if(line.startsWith("/announce ")){
			const message=line.substring(10);
			await writeSloppy(message,"system");
		}
		if(!line.startsWith("/")){
			await writeFountain(line);
		}
	}
}

const systemBufferSize=1e6;
let readingSystem:boolean=false;
const systemBuffer = new Uint8Array(systemBufferSize);
export async function readSystem(){
	if(!slopPipe) return;
	readingSystem=true;
	let n=null;
	try{
		n = await Deno.stdin.read(systemBuffer);
	}catch(e){
		echo("readFountain",e);
	}
	readingSystem=false;
	if (n == null) {
		// TODO: share exit hatch with below
		const disconnected=disconnectFountain();
		return null;
	}else{
		const received = systemBuffer.subarray(0, n);
		return {system:received};
	}
}

// borrowed from slophole

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

// fountain connection goes PEEP

function echo(...data: any[]){
	console.error("[PEEP]",data);
}

const encoder = new TextEncoder();
export async function writeFountain(message:string){
	if(!slopPipe) return;
	const data=encoder.encode(message);	
	let offset = 0;
//	echo("writing",message);
	while (offset < data.length) {
		const written = await slopPipe.write(data.subarray(offset));
		offset += written;
	}
	echo("wrote",message);
}

const rxBufferSize=1e6;
const rxBuffer = new Uint8Array(rxBufferSize);

let slopPipe:Deno.Conn;

export async function connectFountain():Promise<boolean>{
	try{
		slopPipe = await Deno.connect({hostname:"localhost",port:8081});
		echo("connected","localhost:8081");
		return true;
	}catch(error){
		if (error instanceof Deno.errors.ConnectionRefused) {
			echo("Connection Refused",error.message);
		}else{
			const message=JSON.stringify(error,null,0);
			echo("Connection Error",message);
		}
	}
	return false;
}

export function disconnectFountain(){
	if(!slopPipe) return false;
	slopPipe.close();
	echo("Disconnected");
	slopPipe=null;
	return true;
}

let readingSlop:bool=false;
const fountainDecoder = new TextDecoder();
export async function readFountain(){
	if(!slopPipe) return;
	readingSlop=true;
	let n=null;
	try{
		n = await slopPipe.read(rxBuffer);
	}catch(e){
		echo("readFountain",e);
	}
	readingSlop=false;
	if (n == null) {
		const disconnected=disconnectFountain();
		return null;
	}else{
		// TODO: consider moving decode stage
		const received = rxBuffer.subarray(0, n);
		const message = fountainDecoder.decode(received);
		return {message};
	}
}

/*

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

echo("bye");
disconnectFountain();
Deno.exit(0);
*/
