// sloppy.ts - a research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

const quotes=[
	"🤖 I am sloppy the janitor",
	"did thing thing call for a plunge? 🪠",
	"frump system prompt you say?"
];

// system stdin support for sloppies

const systemDecoder = new TextDecoder();
function onSystem(rx:Uint8Array){
	const message:string=systemDecoder.decode(rx);
	const lines=message.split("\r\n");
	lines.pop();//ignore the incomplete
	for(const line of lines){
		console.log("[STDIO]",line);
		if(line=="exit") Deno.exit(0);
		// TODO: add command line api here
	}
}

const systemBufferSize=1e6;
let readingSystem:boolean=false;
const systemBuffer = new Uint8Array(systemBufferSize);
async function readSystem(){
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

// TODO: add sender argument
function onResult(message){
	echo(message);
}

// borrowed from slophole

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

function echo(...data: any[]){
	console.error("[PEEP]",data);
}

const encoder = new TextEncoder();

async function writeFountain(message:string){
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

async function connectFountain():Promise<boolean>{
	try{
		slopPipe = await Deno.connect({hostname:"localhost",port:8081});
		echo("connected","localhost:8081");
		return true;
	}catch(error){
		if (error instanceof Deno.errors.ConnectionRefused) {
			echo("Connection Refused",error.message);
		}else{
			const message=JSON.stringify(error);
			echo("Connection Error",message);
		}
	}
	return false;
}

function disconnectFountain(){
	if(!slopPipe) return false;
	slopPipe.close();
	echo("Disconnected");
	slopPipe=null;
	return true;
}

let readingSlop:bool=false;
const fountainDecoder = new TextDecoder();
async function readFountain(){
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
		const received = rxBuffer.subarray(0, n);
		const message = fountainDecoder.decode(received);
		return {message};
	}
}

// main app starts here

console.log("[SLOPPY] slopchat discord bot by simon 0.02");

let quoteCount=0;
let openChannel=null;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once('ready', () => {
	console.log("[SLOPPY] client ready",client.user?.tag||"");
	client.user?.setPresence({ status: 'online' });
//	console.log("[SLOPPY] channels",client.channels);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.content === '!ping') {
		message.reply('pong!');
		console.log("[SLOPPY]","pong!")
	}
    if (message.mentions.has(client.user) && !message.author.bot) {
		const from=message.author.username;	//skudmarks
		const name=message.author.displayName;
		const quote=quotes[quoteCount++%quotes.length];
        message.reply("@"+name+" "+quote);
    }
});

Deno.addSignalListener("SIGINT", () => {
	client.user?.setPresence({status:"dnd"});	// online idle dnd
	// todo: validate disconnect?
	client.destroy();
	console.log("[SLOPPY] exit");
	Deno.exit(0);
});

const token=Deno.env.get("DISCORD_BOT");
await client.login(token)

await connectFountain();
writeFountain("hi");
let portPromise=readFountain();
let systemPromise=readSystem();
while(true){
	const race=[portPromise,systemPromise];
	const result=await Promise.race(race);
	if (result==null) break;
	if(result.system) {
		onSystem(result.system);
		systemPromise=readSystem();
	}
	if(result.message) {
		onResult(result.message);
		portPromise=readFountain();		
	}
//	echo("result",result);
	await(sleep(500));
}

echo("bye");
disconnectFountain();
Deno.exit(0);
