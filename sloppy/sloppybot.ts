// sloppybot.ts 
// A research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

// receive message from fountain /announce and echo to discord bot
// keep json flat single line

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

const sloppyBanner="[SLOPPY] sloppy 0.06 sentient discord bot by nitrologic";

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

const quotes=[
	"🤖 I am sloppy the janitor",
	"did thing thing call for a plunge? 🪠",
	"frump system prompt you say?"
];

// discord channel send

let quoteCount=0;

//let openChannel="1235838347717378118";
let openChannel="1410693060672753704";

// rate guard required, a sleep 1500 ms currently in force on all writes

const codeFence="```\n";
async function messageSloppy(message:string,from:string){
	if(openChannel){
		const channel = await discordClient.channels.fetch(openChannel);
		if (channel?.isTextBased()) {
//			channel.send("["+from+"] "+message);
			const chunks=chunkContent(message,2000-400);
			for(const chunk of chunks){
				const chunk2=chunk.replaceAll("```","---");
				const post=codeFence+"["+from+"]\n"+chunk2+codeFence;
				channel.send(post);
			}
			await(sleep(1500));
		}
	}
}

// TODO: add {messages:[{message,from}]} support

async function onFountain(message:string){
	const line=message;
	if(line.startsWith("/announce ")){
		const message=line.substring(10);
		await messageSloppy(message,"fountain");
	}
	if(line.startsWith("{")||line.startsWith("[")){
		try{
			let cursor=0;
			while(cursor<line.length){
				// NDJSON is the rule
				const delim=line.indexOf("}\n{",cursor);// less than healthy
				const json=(delim==-1)?line.substring(cursor):line.substring(cursor,delim+1);
				cursor+=json.length;
				const payload=JSON.parse(json);
				for(const {message,from} of payload.messages){
					await messageSloppy(message,from);
				}
			}
		}catch(error){
			echo("JSON parse error",error);
			echo("JSON parse error",line);
		}
	}
}

// system stdin support for sloppies

const systemDecoder = new TextDecoder();
async function onSystem(rx:Uint8Array){
	const message:string=systemDecoder.decode(rx);
	const lines=message.split("\r\n");
	lines.pop();//ignore the incomplete
	for(const line of lines){
		console.log("[STDIO]",line);
		if(line=="exit") Deno.exit(0);
		if(line.startsWith("/announce ")){
			const message=line.substring(10);
			await messageSloppy(message,"system");
		}
		if(!line.startsWith("/")){
			await writeFountain(line);
		}
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

// log noise signed [BOT]

function echo(...data: any[]){
	console.error("[BOT]",data);
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
			const message=JSON.stringify(error,null,0);
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

let readingSlop:boolean=false;
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
		// TODO: consider moving decode stage
		const received = rxBuffer.subarray(0, n);
		const message = fountainDecoder.decode(received);
		return {message};
	}
}

// main app starts here

console.log(sloppyBanner);

const discordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

discordClient.once('ready', () => {
	console.log("[SLOPPY] discordClient online",discordClient.user?.tag||"");
	discordClient.user?.setPresence({ status: 'online' });
//	console.log("[SLOPPY] channels",discordClient.channels);
});


function chunkContent(content:string,chunk:number):string[]{
	const chunks:string[]=[];
	let line="";
	for(let cursor=0;cursor<content.length;cursor+=line.length){
		const n=content.length-cursor;
		if(n<=chunk){
			line=content.substring(cursor);
		}else{
			line=content.substring(cursor,cursor+chunk);
			const eol=line.lastIndexOf("\n");
			if(eol!=-1){
				line=line.substring(0,eol+1);
			}
		}
		chunks.push(line);
	}	
	return chunks;
}

const UserCommands=[
	"model","bibli","spec","sys","announce","listen","think","temp","forge","counter","tag","account","credit",
	"help","nic","config","time","say","open","audition","log","history","list","load","save","note","dump",
	"begin","finish","reset","cd","dir","drop","attach","share","push","commit","raw","slop"
];

// content has BASE_TYPE_MAX_LENGTH = 4000
discordClient.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.content === '!ping') {
		await message.react("❤️");
		await message.reply('pong!');
		openChannel=message.channelId;
		const flake=message.channelId.toString();
		console.log("[SLOPPY]","pong flake",flake,openChannel);
		return;
	}
	if (message.channelId==openChannel) {
//    if (message.mentions.has(discordClient.user) && !message.author.bot) {
		const from=message.author.username+"@discord";	//skudmarks@discord
		const name=message.author.displayName;	
		// check for commands
		const words=message.content.split(" ",2);
		const command=words[0];
		const args=words[1]||"";
		if(UserCommands.includes(command.substring(1))){
			if(true){
				echo("User commands in discord channel currently disabled",command,args,from)
			}else{
				echo("User command in discord channel",command,args,from)
				const blob={command:{name:command,args,from}};
				await writeFountain(JSON.stringify(blob,null,0));
			}
			return;
		}
		// chunk the content under discord limit
		const contents=chunkContent(message.content,4000-400);
		for(const content of contents){
			const blob={messages:[{message:content,from}]};
			await writeFountain(JSON.stringify(blob,null,0));
		}
		if(true||contents.length==0){
			const quote=quotes[quoteCount++%quotes.length];
			message.reply("@"+name+" "+quote);
		}
		if(false){
			echo("[MESSAGE]",message);
		}
	}
});

Deno.addSignalListener("SIGINT", () => {
	discordClient.user?.setPresence({status:"dnd"});	// online idle dnd
	// todo: validate disconnect?
	discordClient.destroy();
	console.log("[SLOPPY] exit");
	Deno.exit(0);
});

const token=Deno.env.get("DISCORD_BOT");
await discordClient.login(token)

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
