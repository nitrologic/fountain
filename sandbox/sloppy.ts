// sloppy.ts - a research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

// borrowed from slophole

function echo(...data: any[]){
	console.error("[PIPE]",data);
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
		echo("slopPipe connected","localhost:8081");
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
	echo("slopPipe disconnected");
	slopPipe=null;
	return true;
}

let readingSlop:bool=false;
const decoder = new TextDecoder();

async function readFountain(){
	if(!slopPipe) return;
	readingSlop=true;
	echo(readingSlop);
	let n=null;
	try{
		n = await slopPipe.read(rxBuffer);
	}catch(e){
		echo("readFountain",e);
	}
	if (n == null) {
		const disconnected=disconnectFountain();
		self.postMessage({disconnected});
	}else{
		const received = rxBuffer.subarray(0, n);
		const message = decoder.decode(received);
		echo("slopPipe received:", message);		
		self.postMessage({received:message});
	}
	readingSlop=false;
}

// main app starts here

console.log("[SLOPPY] slopchat discord bot by simon 0.02");

let quoteCount=0;
let openChannel=null;

const quotes=[
	"[TS] fountain sandbox says @skid is not here"
];

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
writeFountain("sloppy says what?");