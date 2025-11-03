# 🦜

# code under observation

## http

Never mind the the ssh and discord, here's the web client.

The sloppyhost.ts (198) and slophole.ts (121) worker deno script

## SSH

With Discord firing on all cylinders we ditch the old telnet code in favor of SSH2
connections where unicode and other mod cons are standard.

Security is the name of the game with ssh.

Viewers at home will notice

* ssh-keygen instructions
* hardcoded use of said keys generated
* a password checker from narnia

### ssh localhost

![](../slop/screenshots/ssh-local.png)

## Discord 

It was discord week

In a newly created root of fountain sloppy is this morning 200 lines of deno.

### sloppy.ts code review of a rapidly growing deno utility 

August 2025 was going to be private repos with venture capital pitch decks flowing with enthusiasm.

Huh.

Instead the path of least resistance lays down for the keep it simple stupids and preambles with MIT license move us along.

```
// sloppy.ts - a research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

roha {"key":"roha","count":135008,"bytes":19523041}
deepseek-chat {"key":"deepseek-chat","count":22585,"bytes":774966}
gpt-5-mini {"key":"gpt-5-mini","count":8186,"bytes":390350}
claude-sonnet-4 {"key":"claude-sonnet-4","count":6824,"bytes":264577}
nitro@ryzen5 {"key":"nitro@ryzen5","count":4115,"bytes":246072}
kimi-k2-0905 {"key":"kimi-k2-0905","count":4670,"bytes":172620}
grok-4-0709 {"key":"grok-4-0709","count":1977,"bytes":84878}
qwen3-coder-plus {"key":"qwen3-coder-plus","count":1849,"bytes":56320}
grok-code-fast-1 {"key":"grok-code-fast-1","count":1151,"bytes":53615}
gemini-2.5-flash {"key":"gemini-2.5-flash","count":1088,"bytes":48362}
PORT {"key":"PORT","count":870,"bytes":47272}
kimi-k2-0711 {"key":"kimi-k2-0711","count":998,"bytes":36675}
o4-mini-2025 {"key":"o4-mini-2025","count":863,"bytes":26947}
claude-haiku-4-5 {"key":"claude-haiku-4-5","count":709,"bytes":26118}
gemini-2.5-05 {"key":"gemini-2.5-05","count":450,"bytes":23096}
grok-4-fast-reasoning {"key":"grok-4-fast-reasoning","count":425,"bytes":18380}
llama-4-maverick {"key":"llama-4-maverick","count":392,"bytes":17772}
simon@midnightblue {"key":"simon@midnightblue","count":391,"bytes":17711}
gpt-5-2025 {"key":"gpt-5-2025","count":390,"bytes":17437}
qwen-plus {"key":"qwen-plus","count":427,"bytes":14519}
grok-4-fast-non {"key":"grok-4-fast-non","count":314,"bytes":11692}
claude-opus-4-1 {"key":"claude-opus-4-1","count":224,"bytes":10809}
gpt-5-codex {"key":"gpt-5-codex","count":187,"bytes":9999}
gpt-5-nano {"key":"gpt-5-nano","count":175,"bytes":8943}
ec2-user@skidnz {"key":"ec2-user@skidnz","count":168,"bytes":8743}
stdin {"key":"stdin","count":413,"bytes":8569}
kimi-k2-turbo {"key":"kimi-k2-turbo","count":195,"bytes":7698}
gemini-2.5-flash-preview {"key":"gemini-2.5-flash-preview","count":139,"bytes":7352}
claude-3-haiku {"key":"claude-3-haiku","count":166,"bytes":7185}
deepseek-reasoner {"key":"deepseek-reasoner","count":105,"bytes":6336}
codex-mini-latest {"key":"codex-mini-latest","count":160,"bytes":5163}
grok-3 {"key":"grok-3","count":75,"bytes":4123}
gemini-2.5-pro-preview {"key":"gemini-2.5-pro-preview","count":63,"bytes":3666}
gpt-4.1-2025 {"key":"gpt-4.1-2025","count":62,"bytes":3274}
qwen3-next-80b-a3b {"key":"qwen3-next-80b-a3b","count":69,"bytes":3044}
gpt-5-pro {"key":"gpt-5-pro","count":60,"bytes":2833}
moonshot-v1-128k {"key":"moonshot-v1-128k","count":41,"bytes":2590}
qwen-plus-2025 {"key":"qwen-plus-2025","count":48,"bytes":2371}
gpt-4.1-nano {"key":"gpt-4.1-nano","count":41,"bytes":1773}
claude-opus-4 {"key":"claude-opus-4","count":31,"bytes":1459}
qwen3-max-2025 {"key":"qwen3-max-2025","count":18,"bytes":1032}
llama-4-scout {"key":"llama-4-scout","count":13,"bytes":609}
skidracer@skid.nz {"key":"skidracer@skid.nz","count":11,"bytes":414}
ec2-user@sydney {"key":"ec2-user@sydney","count":8,"bytes":271}
ec2-user@ip-172-31-37-83 {"key":"ec2-user@ip-172-31-37-83","count":9,"bytes":260}
skidnz@skid.nz {"key":"skidnz@skid.nz","count":3,"bytes":163}
gemini-2.5-pro {"key":"gemini-2.5-pro","count":2,"bytes":75}
gpt-5-chat-latest {"key":"gpt-5-chat-latest","count":2,"bytes":33}
ec2-user@syd {"key":"ec2-user@syd","count":1,"bytes":4}

const quotes=[
	"🦜 I am sloppy the janitor",
	"did thing thing call for a plunge? 🪠",
	"frump system prompt you say?"
];
````

## the promise race

As we progress into more complex connections in software development, we typically encounter the race condition.

POSIX programmers will know it as the select statement.

https://man7.org/linux/man-pages/man2/select.2.html

In modern javascript I now know it as the promise race.

Here is the main loop of our discord spawning command line utility.

```
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
```

There is alternative ways to service each service. 

Matching the contents of the payload returned by the async function yet to pass the smell test.

As an amateur who has only typed await Promise.race very recently this is all of course a learning journey, not an exercise in best practice carry on.

Having a stack of functions that are all racing to deliver cargo can get very hairy. 

Mad hatter v8 says:

```
<--- Last few GCs --->

[604:000001A87A0BC000]    35175 ms: Scavenge (during sweeping) 4077.9 (4090.8) -> 4074.9 (4093.6) MB, pooled: 0.0 MB, 10.14 / 0.00 ms (average mu = 0.267, current mu = 0.227) allocation failure;
[604:000001A87A0BC000]    36394 ms: Mark-Compact (reduce) 4080.9 (4093.8) -> 4077.3 (4082.3) MB, pooled: 0.0 MB, 541.83 / 0.00 ms (+ 478.3 ms in 96 steps since start of marking, biggest step 5.0 ms, walltime since start of marking 1088 ms) (average mu = 0


#
# Fatal JavaScript out of memory: Ineffective mark-compacts near heap limit
#
==== C stack trace ===============================

        CrashForExceptionInNonABICompliantCodeRange [0x0x7ff6d791ae2b+1625755]
        node_api_get_module_file_name [0x0x7ff6d757ee97+22176951]
        node_api_get_module_file_name [0x0x7ff6d75af9da+22376442]
        node_api_get_module_file_name [0x0x7ff6d755ad3a+22029146]
        node_api_get_module_file_name [0x0x7ff6d7611b27+22778183]
        node_api_get_module_file_name [0x0x7ff6d761596a+22794122]
        node_api_get_module_file_name [0x0x7ff6d76252c7+22857959]
        node_api_get_module_file_name [0x0x7ff6d7624a6b+22855819]
        aws_lc_0_26_0_BIO_hexdump [0x0x7ff6d8f00e5d+1218797]
        node_api_get_module_file_name [0x0x7ff6d760f3eb+22768139]
        CrashForExceptionInNonABICompliantCodeRange [0x0x7ff6d78da510+1361280]
        CrashForExceptionInNonABICompliantCodeRange [0x0x7ff6d80fd47c+9893100]
        (No symbol) [0x0x1a81fe7783a]
```


## Fountain plumbing

This fat patch of interface has been given notice.

Glad it works. :whew:.

```
// fountain connection goes PEEP

function echo(...data: any[]){
	console.error("[PLEEP]",data);
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
		const received = rxBuffer.subarray(0, n);
		const message = fountainDecoder.decode(received);
		return {message};
	}
}
```
