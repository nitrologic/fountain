// sloppyutils.ts - refactored fluffups
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

async function postSloppy(message:string,from:string){
	if(openChannel){
		const channel = await client.channels.fetch(openChannel);
		if (channel?.isTextBased()) {
			const line="["+from+"] "+message+"\r\n";
			await channel.send(line);
		}
	}
}

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
			await postSloppy(message,"system");
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

export function wrapText(content:string,wide:number):string[]{
	const lines=[];
	let cursor=0;
	while(cursor<content.length){
		let line=content.slice(cursor,cursor+wide);
		if(line.length>=wide){
			let n=line.lastIndexOf("\n");
			if(n==-1) n=line.lastIndexOf(" ");
			if(n!=-1) line=line.substring(0,n+1);
		}
		cursor+=line.length;
		lines.push(line);
	}
	return lines;
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
	while (offset < data.length) {
		const written = await slopPipe.write(data.subarray(offset));
		offset += written;
	}
	echo("wrote",message);
}

let slopPipe:Deno.Conn;

export async function connectFountain():Promise<boolean>{
	try{
		slopPipe = await Deno.connect({hostname:"localhost",port:8081});
		echo("connected","localhost:8081");
		slopPipe.setNoDelay(true);
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

const rxBufferSize=1e6;
const rxBuffer = new Uint8Array(rxBufferSize);
let readingSlop:boolean=false;
const fountainDecoder = new TextDecoder();
let fountainBuffer = "";
export async function readFountain(){
	if(!slopPipe) return;
	while(true){
		readingSlop=true;
		let n=null;
		try{
			n = await slopPipe.read(rxBuffer);
		}catch(e){
			echo("readFountain error",e);
		}
		readingSlop=false;
		if (n == null) {
			const disconnected=disconnectFountain();
			return null;
		}else{
			if(n){
				const received = rxBuffer.subarray(0, n);
				const chars = fountainDecoder.decode(received);
				fountainBuffer=fountainBuffer+chars;
				const pos=fountainBuffer.indexOf("\t");
//				echo("readFountain",fountainBuffer,pos);
				if(pos!=-1){
					const line=fountainBuffer.substring(0,pos);
					fountainBuffer=fountainBuffer.substring(pos+1);
					return {message:line};
				}
			}
		}
	}
}
