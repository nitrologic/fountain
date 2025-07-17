// fountain.js - A research tool for smelting large language models.
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { encodeBase64 } from "https://deno.land/std/encoding/base64.ts";
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts";
import { resolve } from "https://deno.land/std/path/mod.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import {Anthropic } from "npm:@anthropic-ai/sdk";

const env=Deno.env;

// bad terminal emoji - ⚙️⚙️

// 𓆝 𓆟 𓆞 𓆝 𓆟
// ⚛

// Tested with Deno 2.4.0, V8 13.7.152.6, TypeScript 5.8.3

// read_time fetch_file submit_file tag_slop
//
// fetch and submit file base is forge/
//
// mut:{name,hasForge,notes:[],errors:[],relays:0,cost:0,elapsed:0}

// fountain.js relay
// with account config api and model info
// sends payload
// for {model,mut}
// grokFunctions {tools}
// !info.cold {temperature}
// info.max_tokens {max_tokens}
// grokThinking {config:{thinkingConfig:{thinkingBudget:grokThink}}}
// logs response
//

const fountainVersion="1.2.5";
const fountainName="fountain "+fountainVersion;

const rohaTitle=fountainName+" ⛲ ";

const toolKey={tools:"🪣",notool:"🐸",off:"🪠"};		//🚫"};

const terminalColumns=120;
const statsColumn=50;
const clipLog=1800;

const defaultModel="deepseek-chat@deepseek";

const rohaMihi="Welcome to the fountain, a many:many user model research project.";

const rohaGuide=[
	"As a guest assistant language model please be mindful of others, courteous and professional.",
	"Keep response short and only post code on request.",
	"Tabs not spaces."
]

const mutsInclude="models under test include "

const username=env.get("USERNAME");
const userdomain=env.get("USERDOMAIN").toLowerCase();
const userregion = Intl.DateTimeFormat().resolvedOptions();

const userterminal=env.get("TERM")||env.get("TERM_PROGRAM")||env.get("SESSIONNAME")||"VOID";

const cleanupRequired="Switch model, drop shares or reset history to continue.";
const warnDirty="Feel free to comment if shared files are new or different.";
const exitMessage="Ending session.";

const boxChars=["┌┐└┘─┬┴│┤├┼","╔╗╚╝═╦╩║╣╠╬","┏┓┗┛━┳┻┃┫┣╋"];

const break50="─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴─┬┴";
const rule50= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

const pageBreak=break50+break50+break50;
const pageRule=rule50+rule50+rule50;

const slowMillis=25;
const MaxFileSize=512*1024;

const appDir=Deno.cwd();
const accountsPath=resolve(appDir,"accounts.json");
const specsPath=resolve(appDir,"modelspecs.json");
const unicodePath=resolve(appDir,"slopspec.json");

const forgePath=resolve(appDir,"forge");
const rohaPath=resolve(forgePath,"forge.json");

const modelAccounts=JSON.parse(await Deno.readTextFile(accountsPath));
const modelSpecs=JSON.parse(await Deno.readTextFile(specsPath));
const unicodeSpec=JSON.parse(await Deno.readTextFile(unicodePath));

const emojiIndex = {};

function parseUnicode(){
	for(const group in unicodeSpec){
		const keys = Object.keys(unicodeSpec[group].emoji);
		echo("[UNICODE]",group,keys.join(" "));
	}
}

function stringwidth2(str) {
	let width = 0;
	for (const char of str) {
		width += emojiIndex[char] || 1;
	}
	return width;
}

const decoder=new TextDecoder("utf-8");
const encoder=new TextEncoder();

// rohaHistory is array of {role,name||title,content}
// attached as payload messages in chat completions

let rohaHistory=[];
let rohaModel="mut";	//mut name excludes preview version details

const flagNames={
	squash : "squash message sequences in output",
	reasonoutloud : "echo chain of thought",
	tools : "enable model tool interface",
	commitonstart : "commit shared files on start",
	saveonexit : " save conversation history on exit",
	ansi : "markdown ANSI rendering",
	verbose : "emit debug information",
	broken : "ansi background blocks",
	logging : "log all output to file",
	debugging : "emit diagnostics",
	pushonshare : "emit a /push after any /share",
	rawprompt : "experimental rawmode stdin deno prompt replacement",
	resetcounters : "factory reset when reset",
	returntopush : "hit return to /push - under test",
	slow : "experimental output at reading speed"
};

const emptyConfig={
	showWelcome:false,
	reasonoutloud:false,
	tools:false,
	commitonstart:false,
	saveonexit:false,
	ansi:true,
	verbose:false,
	squash:false,
	broken:false,
	logging:false,
	debugging:false,
	pushonshare:false,
	rawprompt:false,
	resetcounters:false,
	returntopush:false,
	slow:false,
	nic:"user"
};

const emptyRoha={
	config:emptyConfig,
	tags:{},
	sharedFiles:[],
	attachedFiles:[],
	saves:[],
	counters:{},
	mut:{},
	lode:{},
	forge:[]
};

let slopPid=null;

function sanitizeNic(nic){
	return nic.replace(/[^a-zA-Z0-9]/g,"");
}

async function exitForge(){
	const pid=slopPid;
	if(pid){
		Deno.kill(Number(pid),"SIGTERM");
		echo("pid",pid,"killed");
		slopPid=null;
	}
	await flush();
	if(roha.config.saveonexit){
		await saveHistory();
	}
	await flush();
	Deno.stdin.setRaw(false);
	console.log("exitForge",exitMessage)
	if(slopConnection) slopConnection.close();
}

let slopPail=[];
let readingSlop=false;
let slopConnection;

//
// let listening=false;
// TODO: use deno comms to talk with slop <=> fountain task comms

const rxBufferSize=1e6;

const rxBuffer = new Uint8Array(rxBufferSize);

// todo: encode slopPipe origin parameter
async function writeSlop(slopPipe,data){
	return await slopPipe.write(data);
}

async function readSlop(slopPipe){
	if(!readingSlop) return;
	readingSlop=true;
	let n=null;
	try{
		n = await slopPipe.read(rxBuffer);
	}catch(e){
		echo("readSlop",e);
	}
	if (n !== null) {
		const received = rxBuffer.subarray(0, n);
		const message = decoder.decode(received);
		echo("readSlop", message);
		// TODO: document me
		self.postMessage({rx:message});
	}
	readingSlop=false;
}

async function serveConnection(connection){
	console.error("\t[fountain] serveConnection ",JSON.stringify(connection));
	const text=encoder.encode("greetings from fountain client");
	await writeSlop(connection,text);
}

async function listenService(){
	echo("listening from fountain for slop on port 8081");
	const listener=Deno.listen({ hostname: "localhost", port: 8081, transport: "tcp" });
	while (true) {
		const connection=await listener.accept();
		slopConnection=connection;
		await serveConnection(connection);
	}
}

function price(credit){
	if (credit === null || isNaN(credit)) return "$0";
	return "$"+credit.toFixed(4);
}

function annotateTag(name,description){
	if(!name){
		throw("null name");
	}
	if(!(name in roha.tags)) {
		roha.tags[name]={};
//		throw("tag not found "+name);
	}
	roha.tags[name].description=description;
}

function annotateShare(name,description){
	let index=roha.sharedFiles.findIndex(item => item.id === name);
	if(index==-1) {
		throw("annotateShare name not found "+name);
	}
	roha.sharedFiles[index].description=description;
	echo("annotateShare annotated file share",name);
}

function increment(key){
	let i=0;
	if(key in roha.counters){
		i=roha.counters[key]+1;
	}
	roha.counters[key]=i;
	return i
}

let modelList=[];
let lodeList=[];

// never read - work in progress

let tagList=[];
let shareList=[];
let memberList=[];

const emptyMUT={notes:[],errors:[],relays:0,cost:0,elapsed:0}
const emptyModel={name:"empty",account:"",hidden:false,prompts:0,completion:0}
const emptyTag={}

// const emptyShare={path,size,modified,hash,tag,id}

let roha=emptyRoha;
let listCommand="";
let creditCommand="";
let rohaShares=[];
let currentDir=Deno.cwd();

const sessionStack=[];

function pushHistory(){
	sessionStack.push(rohaHistory);
	resetHistory();
}
function popHistory(){
	if(sessionStack.length==0) return false;
	return sessionStack.pop();
}
function resetHistory(){
	rohaHistory=[{role:"system",title:fountainName,content:rohaMihi}];
	const guide=rohaGuide.join(" ");
	if (guide) {
		rohaHistory=[{role:"system",title:fountainName,content:guide}];
	}
}

function echoContent(content,wide,left,right){
	const chars=wide-(left+right);
	const indent=" ".repeat(left);
	let cursor=0;
	while(cursor<content.length){
		let line=content.substring(cursor,cursor+chars);
		let n=line.indexOf("\n");
		if(n==-1) n=line.lastIndexOf(" ");
		if(n!=-1) line=line.substring(0,n+1);
		if(line.length){
			echo(indent+line);
			cursor+=line.length;
		}
	}
}

function listHistory(){
	const wide=terminalColumns-statsColumn;
	const history=rohaHistory;
	let total=0;
	for(let i=0;i<history.length;i++){
		const item=history[i];
		const content=readable(item.content);
		const clip=content.substring(0,wide);
		const size="("+content.length+")";
		const role=item.role.padEnd(12," ");
		const name=(item.mut||item.title||item.name||"roha").padEnd(15," ");
		const iii=String(i).padStart(3,"0");
		const spend=item.price?(item.emoji+" "+item.price.toFixed(4)) :"";
		const seconds=item.elapsed?(item.elapsed.toFixed(2)+"s"):"";
		echo(iii,role,name,clip,size,spend,seconds);
		total+=content.length;
	}
	const size=unitString(total,4,"B");
	echo("History size",size);
}

function logHistory(){
	const wide=terminalColumns;
	let history=rohaHistory;
	if(roha.config.squash){
		history=squashMessages(rohaHistory);
	}
	for(let i=0;i<history.length;i++){
		const item=history[i];
		const index=i;//item.index;
		const iii=String(index).padStart(3,"0");
		const spend=item.price?(item.emoji+" "+item.price.toFixed(4)) :"";
		const seconds=item.elapsed?(item.elapsed.toFixed(2)+"s"):"";
		echo(iii,item.role,item.mut||item.title||item.name||"???",spend,seconds);
		const content=readable(item.content).substring(0,clipLog);
		echoContent(content,wide,3,2);
	}
}

// TODO: username is blobuser, pass message type for images
function rohaPush(content,username){
	const item={role:"user",name:username,content:content};
	rohaHistory.push(item);
	slopPail.push({"push":{item}});
}

resetHistory();

// roha

const rohaTools=[{
	type: "function",
	function:{
		name: "read_time",
		description: "Returns current local time",
		parameters: {
			type: "object",
			properties: {},
			required: []
		}
	}
},{
	type: "function",
	function:{
		name: "submit_file",
		description: "Submit a file for review",
		parameters: {
			type: "object",
			properties: {
				contentType:{type:"string"},
				content:{type:"string"}
			},
			required: ["contentType","content"]
		}
	}
},{
	type: "function",
	function:{
		name: "fetch_file",
		description: "Request a file for analysis",
		parameters: {
			type: "object",
			properties: {
				fileName:{type:"string"}
			},
			required: ["fileName"]
		}
	}
},{
	type: "function",
	function: {
		name: "tag_slop",
		description: "Attach description to code tag and share Fountain objects",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string" },
				type: { type:"string" , description:"forge category", enum:["code","session","share","lode"]},
				description: { type: "string" }
			},
			required: ["name","type","description"]
		}
	}
}];

// fountain utility functions

// Define the ranges for single-width characters (including some emojis and symbols)
const singleWidthRanges = [
  [0x269B], // ⚛ Atom symbol
  [0x1F3FB, 0x1F3FF], // Emoji modifiers
  [0x1F9B0, 0x1F9B3], // Skin tone modifiers
  [0x25FE, 0x25FF], // Geometric shapes
];

// here be dragons
// emoji wide char groups may need cludge for abnormal plungers

const isDoubleWidth = (() => {
	const ranges = [
		[0x1100, 0x115F],
		[0x2329, 0x232A],
		[0x2E80, 0x303E],
		[0x3040, 0xA4CF],
		[0xAC00, 0xD7A3],
		[0xF900, 0xFAFF],
		[0xFE10, 0xFE19],
		[0xFE30, 0xFE6F],
		[0xFF00, 0xFF60],
		[0xFFE0, 0xFFE6],
		[0x1F000, 0x1F02F],
		[0x1F0A0, 0x1F0FF],
		[0x1F100, 0x1F1FF],
		[0x1F300, 0x1F9FF],
		[0x20000, 0x2FFFD],
		[0x30000, 0x3FFFD]
	];
	return cp =>
		ranges.some(([s, e]) => cp >= s && cp <= e);
})();

// here be dragons - emoji widths based on userterminal may be required

function stringWidth(str) {
	let w = 0;
	for (const ch of str) {
		w += isDoubleWidth(ch.codePointAt(0)) ? 2 : 1;
	}
	return w;
}


async function fileLength(path) {
	const stat=await Deno.stat(path);
	return stat.size;
}

async function sleep(ms) {
	await new Promise(function(awake) {setTimeout(awake, ms);});
}

function unitString(value,precision=2,type){
	if (typeof value !== 'number' || isNaN(value)) return "NaN";
	const units=["","K","M","G","T"];
	const abs=Math.abs(value);
	const unit=(Math.log10(abs)/3)|0;
	if(unit>0){
		if(unit>4)unit=4;
		let n=value / Math.pow(10, unit*3);
		const digits=Math.max(1, String(Math.floor(n)).length);
		n=n.toFixed(Math.max(0, precision - digits));
		return n+units[unit]+type;
	}
	return String(value)+type;
}

function measure(o){
	const value=(typeof o==="string")?o.length:JSON.stringify(o).length;
	return unitString(value,4,"B");
}

let outputBuffer=[];
let printBuffer=[];
let markdownBuffer=[];

function print(){
	const args=arguments.length?Array.from(arguments):[];
	const lines=args.join(" ").split("\n");
	for(const eachline of lines){
		const line=eachline.trimEnd();
		printBuffer.push({model:rohaModel,line});
	}
}

function toString(arg){
	if (typeof arg === 'object') {
		return JSON.stringify(arg);
	}
	return String(arg);
}

// takes both markdown and plain

function echo(){
	const args=arguments.length?Array.from(arguments):[];
	const lines=[];
	for(const arg of args){
		const line=toString(arg);
		lines.push(line);
	}
	outputBuffer.push(lines.join(" "));
}

function echo_row(...cells){
	const row = cells.map(String).join('|');
	markdownBuffer.push("|"+row+"|");
}

function debug(title,value){
	if(roha.config.verbose){
		const json=JSON.stringify(value);
		echo(title,json);
	}else{
		// was print
		echo(title);
	}
}

async function log(lines,id){
	if(roha.config.logging){
		const time=new Date().toISOString();
		const list=[];
		for(let line of lines.split("\n")){
			line=stripAnsi(line);
			line=time+" ["+id+"] "+line+"\n";
			list.push(line);
		}
		let path=resolve(forgePath,"forge.log");
		await Deno.writeTextFile(path,list.join(),{append:true});
	}
}

async function flush() {
	const delay=roha.config.slow ? slowMillis : 0;
	for (const mutline of printBuffer) {
		const mut=mutline.model;
		const line=mutline.line;
		console.log(line);
		await log(line,mut);
		await sleep(delay)
	}
	printBuffer=[];

	const md=markdownBuffer.join("\n");
	if(md.length){
		if (roha.config.ansi) {
			const ansi=mdToAnsi(md);
			console.log(ansi+"🌟");
		}else{
			if(md.length) console.log(md);
		}
	}
	markdownBuffer=[];

	for (const line of outputBuffer) {
		console.log(line);
		await log(line,"roha");
		await sleep(delay);
	}
	outputBuffer=[];
}

function wordWrap(text,cols=terminalColumns){
	const result=[];
	let pos=0;
	while(pos<text.length){
		let line=text.substring(pos,pos+cols);
		let n=line.length;
		if(n==cols){
			let i=line.lastIndexOf(" ",n);
			if(i>0){
				line=line.substring(0,i);
				n=i+1;
			}
		}
		result.push(line);
		pos+=n;
	}
	return result.join("\n");
}

async function listModels(config){
	let url=config.url+"/models";
	let response=await fetch(url);
	if(response.ok){
		console.log(await response.text());
	}else{
		console.error(response);
	}
	return null;
}

// API support for openai deepseek gemini anthropic cohere

// https://ai.google.dev/gemini-api/docs/text-generation

// todo: guard against multiHistory content - original payloads only

function geminiTools(payload){
	const functions=[];
	for(const tool of payload.tools){
//		geminiTools(payload)
//		debug("[GEMINI] tool",tool);
		if(tool.type=="function"){
			const f=tool.function;
			const p=f.parameters;
			const d={name:f.name,description:f.description,parameters:{type:p.type,properties:p.properties,required:p.required}};
//			debug("[GEMINI] function",d);
			functions.push(d);
		}
	}
	return {functionDeclarations:functions};
}

function prepareGeminiContent(payload){
	const debugging=roha.config.debugging;
	if(debugging) echo("[GEMINI] payload",payload);
	const contents=[];
	const sysparts=[];	// GenerateContentRequest systemInstruction content
	let blob={};
	for(const item of payload.messages){
		if(debugging) echo("[GEMINI] item",item);
		const text=item.content;
		if(debugging) echo("[GEMINI] text",text);
		switch(item.role){
			case "system":
				sysparts.push({text});
				break;
			case "assistant":{
				if(item.tool_call_id){
					// todo - geminifi the tool result
					const ass={role:"user",parts:[{text}]}
					debug("[GEMINI] ass",ass);
//					contents.push(ass);
				}else{
					const ass={role:"model",parts:[{text}]}
					debug("[GEMINI] ass",ass);
//					contents.push(ass);
				}
				}
				break;
			case "user":{
					if(debugging) debug("[GEMINI] prepare",item);
					if(item.name=="blob"){
						blob=JSON.parse(text);
						continue;
					}
					// should this be title?
					if(item.name=="image"){
						const mimeType=blob.type;
						const data=text;
						debug("[GEMINI] image",mimeType);
						contents.push({role:"user",parts:[{inlineData:{mimeType,data}}]});
						continue;
					}
					if(item.content?.length){
						contents.push({role:"user",parts:[{text:item.content}]});
					}
				}
				break;
			case "tool":{
					const functionResponse={name:item.name,response:JSON.parse(text)};
					contents.push({role:"user",parts:[{functionResponse}] });
				}
				break;
		}
	}

	// TODO: enable disable tools
	// TODO: tools and toolsconfig support

	const tools=payload.tools?geminiTools(payload):[];

	//system_instruction

	const request={model:payload.model,system_instruction:{parts:sysparts},contents,tools};

	if(debugging) debug("[GEMINI] request",request);

	return request;
}

let geminiCallCount=0;

async function connectGoogle(account,config){
	try{
		const baseURL=config.url;
		const apiKey=env.get(config.env);
		if(!apiKey) return null;
		const response=await fetch(baseURL+"/models?key="+apiKey);
		if (!response.ok) {
			console.info("connectGoogle response",response)
			return null;
		}
		const models=await response.json();
		const list=[];
		for(const model of models.models){
			list.push(model.name+"@"+account);
		}
		modelList.push(...list);
		const genAI=new GoogleGenerativeAI(apiKey);
		return {
			genAI,
			apiKey,
			baseURL,
			modelList:list,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
//						config: { systemInstruction: setup, maxOutputTokens: 500,temperature: 0.1, }
						const model=genAI.getGenerativeModel({model:payload.model});
						const request=prepareGeminiContent(payload);
						// TODO: hook up ,signal SingleRequestOptions parameter
						// if(roha.config.debugging) debug("[GEMINI] generateContent",request);
						const result=await model.generateContent(request);
						if(roha.config.verbose) echo("[GEMINI] result",result);
						const text=await result.response.text();
						const usage=result.response.usageMetadata||{};
						const choices = [];
						choices.push({message:{content:text}});
						const calls = result.response.functionCalls(); // Get Gemini's raw function calls
						if(calls){
							const toolCalls = calls.map((call,index)=>({id:"call_"+(geminiCallCount++),type:"function",function:{name:call.name,arguments:JSON.stringify(call.args)}}));
							choices[0].message.tool_calls=toolCalls;
							debug("[GEMINI] toolCalls",toolCalls);
//							for(const call of toolCalls){
//								debug("[GEMINI] toolCall",call);
//								choices.push({tool_calls:call});
//							}
						}
						return {
							model:payload.model,
							choices,
							usage:{
								prompt_tokens:usage.promptTokenCount,
								completion_tokens:usage.candidatesTokenCount+usage.thoughtsTokenCount,
								total_tokens:usage.totalTokenCount
							}
						};
					},
				},
			},
		};
	} catch (error) {
		console.error("connectGoogle error:",error.message);
		return null;
	}
}

/*
[GEMINI] function calls [{"name":"read_time","args":{}}]

[GEMINI] result
{
	"response":{
		"candidates":[
		{
		"content":{
			"parts":[
{
"functionCall":{
"name":"read_time",
"args":{}
},
"thoughtSignature":"CqQBAVSoXO7q9hO4KnLYj5znB7rbY3bQZH1geNa34BhJHMVmUw6DT7oyyH104UWZSlSTQsgKlRLIfPVExf4/lto3Jp4Xdy+ywEU9WnlWWIYPVW7vl+hJVeqJOLH4GoGMyxy59xz9KA6/t5OiaROo4wIpmsFwrj1AqnsmCgO/6UzTaShKTjJrF+7Gr6ybHUblF7YDMZh8kvB02L8Evax8K7uzq4BdwwM="}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":225,"candidatesTokenCount":10,"totalTokenCount":268,"promptTokensDetails":[{"modality":"TEXT","tokenCount":225}],"thoughtsTokenCount":33},"modelVersion":"models/gemini-2.5-flash-preview-05-20","responseId":"5J50aOOxDdfVz7IP37C3sQ8"}}



 "tools": [
	  {
		"functionDeclarations": [
		  {
			"name": "schedule_meeting",
			"description": "Schedules a meeting with specified attendees at a given time and date.",
			"parameters": {
			  "type": "object",
			  "properties": {
				"attendees": {
				  "type": "array",
				  "items": {"type": "string"},
				  "description": "List of people attending the meeting."
				},
				"date": {
				  "type": "string",
				  "description": "Date of the meeting (e.g., '2024-07-29')"
				},
				"time": {
				  "type": "string",
				  "description": "Time of the meeting (e.g., '15:00')"
				},
				"topic": {
				  "type": "string",
				  "description": "The subject or topic of the meeting."
				}
			  },
			  "required": ["attendees", "date", "time", "topic"]
			}
		  }
		]


"tools": [
{
"type": "function",
"function": {
"name": "read_time",
"description": "Returns current local time",
"parameters": {
"type": "object",
"properties": {},
"required": []
}
}
},




*/




//messages: [{ role: "user", content: "Hello, Claude" }],

function anthropicSystem(payload){
	const system=[];
	for(const item of payload.messages){
		switch(item.role){
			case "system":
				system.push({type:"text",text:item.content});
				break;
		}
	}
	return system;
}

function anthropicMessages(payload){
	const messages=[];
	for(const item of payload.messages){
		switch(item.role){
			case "user":
				for(const content of item.content){
					messages.push({role:"user",content:content.text});
				}
				break;
			case "assistant":
				if(item.tool_calls){
					list.push({role:item.role,content:item.content,tool_calls:item.tool_calls});
				}else{
					messages.push({role:"assistant",content:item.content});
				}
				break;
		}
	}
	return messages;
}

function anthropicTools(payload){
	const tools=[];
	for(const tool of payload.tools){
		const f=tool.function;
		const s=f.parameters;
		const d={name:f.name,description:f.description,input_schema:s};
		tools.push(d);
	}
	return tools;
}

async function connectAnthropic(account,config){
	try{
		const baseURL=config.url;
		const apiKey=env.get(config.env);
		if(!apiKey) return null;
		const headers={
			"x-api-key":apiKey,
			"Content-Type": "application/json",
			"anthropic-version": "2023-06-01"
		};
		const response = await fetch(baseURL+"/models",{ method: "GET", headers });
		if (!response.ok) {
			console.info("connectAnthropic response",response)
			return null;
		}
		const data=await response.json();
		const list=[];
		for(const model of data.data){
			//{"type":"model","id":"claude-opus-4-20250514","display_name":"Claude Opus 4","created_at":"2025-05-22T00:00:00Z"}
			if(model.type=="model"){
				const name=model.id+"@"+account;
				list.push(name);
				const spec={id:model.id,object:"model",created:model.created_at,owner:"owner"}
				specModel(spec,account);
			}else{
				echo("unexpected model type",model);
			}
		}
		modelList.push(...list);
		const sdk=new Anthropic({apiKey});

		return {
			sdk,
			apiKey,
			baseURL,
			modelList:list,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
						const model=payload.model;
						const system=anthropicSystem(payload);
						const messages=anthropicMessages(payload);
						const request={model,max_tokens:1024,system,messages};
						if (payload.tools) {
							request.tools=anthropicTools(payload);
						}
						const reply = await sdk.messages.create(request);
						const usage={
							prompt_tokens:reply.usage.input_tokens,
							completion_tokens:reply.usage.output_tokens
						};
						return {
							model,
							choices:[
								{message:{content:reply.content[0].text}}
							],
							usage
						};
					}
				}
			}
		};
	} catch (error) {
		console.error("connectAnthropic error:",error.message);
		return null;
	}
}

function specCohereModel(model,account){
	if(roha.config.debugging) echo("[cohere] spec",model);
	const name=model.name+"@"+account;
	const exists=name in roha.mut;
	const info=exists?roha.mut[name]:{name,notes:[],errors:[],relays:0,cost:0};
	info.id=model.name;
	info.object="model";
	info.created="created";
	info.owner="owner";
	if (!info.notes) info.notes=[];
	if (!info.errors) info.errors=[];
//	echo("mut",name,info);
	roha.mut[name]=info;
}

function prepareCohereRequest(payload){
	const history=[];
	let blob={};
	for(const item of payload.messages){
		const content=item.content;
		switch(item.role){
			case "system":
				history.push({role:"system",content});
				break;
			case "user":
				if(item.name=="blob"){
					blob=JSON.parse(content);
					continue;
				}
				if(item.name=="image"){
					const image_url={url:"https://jpeg.org/images/jpeg-home.jpg"}
					history.push({role:"user",content:[{type:"image_url",image_url}]});
					continue;
//					const mediatype=blob.type;
//					const image_url={url:"data:"+mediatype+";base64,"+content};
// [<media-type>][;base64],<data>"
// TODO: url=data:[<media-type>][;base64],<data>
//					history.push({role:"user",content:[{type:"image",data}]});
				}
				history.push({role:"user",content});
				break;
			case "assistant":
				history.push({role:"assistant",content});
				break;
		}
	}
	const request={
		stream:false,
		model:payload.model,
		messages:history
	};
	return request;
}

async function connectCohere(account,config) {
	try{
		const baseURL=config.url;
		const apiKey=env.get(config.env);
		if(!apiKey) return null;
		const headers={
			"Authorization":"Bearer "+apiKey,
			"Content-Type":"application/json",
			"Accept":"application/json"
//			"X-Client-Name": "fountain.js"
		};
		const response=await fetch(baseURL+"/models",{method:"GET",headers});
		if (!response.ok) return null;
		const reply=await response.json();
//		echo(reply.models);
		const list=[];
		for (const model of reply.models) {
			const name=model.name+"@"+account;
			list.push(name);
			specCohereModel(model,account);
		}
		list.sort();
		modelList=modelList.concat(list);
		return {
			apiKey,
			headers,
			baseURL,
			modelList:list,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
						const model=payload.model;
						const content=prepareCohereRequest(payload);
						const url=baseURL+"/chat";
						const usage={prompt_tokens:0,completion_tokens:0,total_tokens:0};
						if(roha.config.debugging){
							echo("[cohere] url",url);
							//echo("[cohere] content",content);
							//echo("[cohere] usage",usage);
							echo("[cohere] headers",headers);
						}
						try{
							const response=await fetch(url,{method:"POST",headers,body:JSON.stringify(content)});
							if(roha.config.debugging){
								echo("[cohere] response.ok",response.ok);
							}
							if (response.ok) {
								//[cohere] json
								// {"id":"5b7e6d03-d348-40b8-8178-a60ad55d792e","message":{"role":"assistant","content":[{"type":"text","text":"Hello! How can I assist you today?"}]},
								// "finish_reason":"COMPLETE","usage":{"billed_units":{"input_tokens":1,"output_tokens":9},"tokens":{"input_tokens":496,"output_tokens":11}}}
								const reply=[];
								const json=await response.json();
								const role=json.message.role;
								for(const item of json.message.content){
									if(item.type=="text") reply.push(item.text);
								}
								const text=reply.join("\n");
								// echo("[cohere]",text)
								const tokens=json.usage.tokens;
								const total_tokens=tokens.input_tokens+tokens.output_tokens;
								const usage={prompt_tokens:tokens.input_tokens,completion_tokens:tokens.output_tokens,total_tokens};
								return {model,choices:[{message:{content:text}}],usage};
							}
							echo("[cohere] status",response.status,response.statusText);
							echo("[cohere] content",content);
						}catch(e){
							echo("[cohere] exception",e.message);
						}
						return {model,choices:[],usage};
					},
				},
			},

		}
	} catch (error) {
		echo(`Account ${account} fetch error: ${error.message}`);
		return null;
	}

}


async function connectDeepSeek(account,config) {
	try{
		const baseURL=config.url;
		const apiKey=env.get(config.env);
		if(!apiKey) return null;
		const headers={Authorization:"Bearer "+apiKey,"Content-Type":"application/json"};
		const response=await fetch(baseURL+"/models",{method:"GET",headers});
		if (!response.ok) return null;
		const models=await response.json();
		const list=[];
		for (const model of models.data) {
			const name=model.id+"@"+account;
			list.push(name);
// dont do this	if(verbose) echo("model - ",JSON.stringify(model,null,"\t"));
			specModel(model,account);
		}
		list.sort();
		modelList=modelList.concat(list);
	//	echo("connected DeepSeek",list);
		return {
			apiKey,
			baseURL,
			modelList:list,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
						const url=`${baseURL}/chat/completions`;
						const response=await fetch(url, {
							method: "POST",
							headers,
							body: JSON.stringify(payload),
						});
						if (!response.ok) {
							throw new Error(`DeepSeek API error: ${response.statusText}`);
						}
						return await response.json();
					},
				},
			},
		};
	} catch (error) {
		echo(`Account ${account} fetch error: ${error.message}`);
		return null;
	}
}

async function connectOpenAI(account,config) {
	try{
		const apiKey=env.get(config.env);
		const endpoint=new OpenAI({ apiKey, baseURL: config.url });
		if(roha.config.debugging){
			for(const [key, value] of Object.entries(endpoint)){
				let content=String(value);
				content=content.replace(/\n/g, " ");
				content=content.substring(0,30);
				if(key!="apiKey") echo("endpoint:"+key+":"+content);
			}
		}
//		const models2=await listModels(config);
		const models=await endpoint.models.list();
		const list=[];
		for (const model of models.data) {
			const name=model.id+"@"+account;
			list.push(name);
// dont do this	if(verbose) echo("model - ",JSON.stringify(model,null,"\t"));
			specModel(model,account);
		}
		list.sort();
		endpoint.modelList=list;
		modelList=modelList.concat(list);
		return endpoint;
	}catch(error){
		// Error: 429 "Your team ^&*^&^&*^&*
		// has either used all available credits or reached its monthly spending limit.
		// To continue making API requests, please purchase more credits or raise your spending limit."
		if(error.status==429){
			echo("Account Credit Error, please topup.");
		}else{
			echo(JSON.stringify(error));
		}
	}
}

async function connectAccount(account) {
	const config=modelAccounts[account];
	if (!config) return null;
	const api= config.api;
	switch(api){
		case "OpenAI":
			return await connectOpenAI(account,config);
		case "DeepSeek":
			return await connectDeepSeek(account,config);
		case "Google":
			return await connectGoogle(account,config);
		case "Anthropic":
			return await connectAnthropic(account,config);
		case "Cohere":
			return await connectCohere(account,config);
	}
	return null;
}

function specAccount(account){
	const config=modelAccounts[account];
	const endpoint=rohaEndpoint[account];
	const models=endpoint.models||[];
	if(!(account in roha.lode)){
		roha.lode[account]={name:account,url:endpoint.baseURL,env:config.env,credit:0,models};
	}
	if(roha.config.debugging){
		const lode=roha.lode[account];
		echo("[FOUNTAIN] specAccount",account,lode);//endpoint);//config);
	}
}

function specModel(model,account){
	const name=model.id+"@"+account;
	const exists=name in roha.mut;
	const info=exists?roha.mut[name]:{name,notes:[],errors:[],relays:0,cost:0};
	info.id=model.id;
	info.object=model.object;
	info.created=model.created;
	info.owner=model.owned_by;
//	echo("statModel",name,JSON.stringify(model));
	if (!info.notes) info.notes=[];
	if (!info.errors) info.errors=[];
//	echo("mut",name,info);
	roha.mut[name]=info;
}

async function aboutModel(modelname){
	const mut=mutName(modelname);
	const info=(modelname in modelSpecs)?modelSpecs[modelname]:null;
	const rate=info?info.pricing||[]:[];
	const id=(info?info.id:0)||0;
	const strict=info?info.strict||false:false;
	const multi=info?info.multi||false:false;
	const inline=info?info.inline||false:false;
	const modelProvider=modelname.split("@");
	const provider=modelProvider[1];
	const account=modelAccounts[provider];
	const emoji=account.emoji||"";
	const lode=roha.lode[provider];
	const balance=(lode&&lode.credit)?price(lode.credit):"$-";
	if(roha.config.verbose){
		echo("model:",{id,mut,emoji,rate,modelname,balance,strict,multi,inline});
	}else{
		echo("model:",{mut,emoji,rate,balance});
	}
	if(roha.config.verbose && info){
		if(info.purpose)echo("purpose:",info.purpose);
		if(info.press)echo("press:",info.press);
		if(info.reality)echo("reality:",info.reality);
	}
	await writeForge();
}

//DeepSeek-R1-Distill-Llama-70B
//Meta-Llama-3.1-8B-Instruct
function mutName(modelname){
	const modelAccount=modelname.split("@");
	const path=modelAccount[0];
	const names=path.split("/");
	let name=names.pop();
	name=name.replace("-R1-Distill-","-");
	name=name.replace("Meta-Llama-","Llama");
	const namebits=name.split("-");	//preview");
	let mut=namebits[0]+(namebits[1]||"")+(namebits[2]||"");
	if(namebits[3]=="vision") mut+="vision";
	return mut;
}

async function resetModel(modelname){
	const modelAccount=modelname.split("@");
	const path=modelAccount[0];
	const provider=modelAccount[1];
	const account=modelAccounts[provider];
	if(!account){
		echo("[reset] account not found",modelname);
		return;
	}
	grokModel=modelname;
	grokAccount=account;
	const mut=mutName(modelname);
	rohaModel=mut;
	grokFunctions=true;
	const content=mutsInclude+mut;
	rohaHistory.push({role:"system",title:userdomain,content});
	await aboutModel(modelname);
}

function dropShares(){
	let dirty=false;
	for(const item of rohaHistory){
		if(item.role==="user" && (item.name==="content" || item.name==="image")){
			item.name="fountain";
			item.content="dropped share";
			dirty=true;
		}
	}
	if(dirty)echo("content removed from history");
	if(rohaShares.length){
		rohaShares=[];
		echo("all shares dropped");
	}
	if(roha.config.commitShares) echo("With commitShares enabled consider /reset.")
}

function listShare(){
	const list=[];
	let count=0;
	const sorted=roha.sharedFiles.slice();
	sorted.sort((a, b) => b.size - a.size);
	for (const share of sorted) {
		const shared=(rohaShares.includes(share.path))?"🔗":"";
		const tags="["+rohaTitle+" "+share.tag+"]";
		const detail=(share.description)?share.description:"";
		echo((count++),share.path,share.size,shared,tags,detail);
		list.push(share.id);
	}
	shareList=list;
}

async function listSaves(){
	const saves=roha.saves||[];
	for(let i=0;i<saves.length;i++){
		const path="forge/"+saves[i];
		const length=await fileLength(path)||"-";
		echo(i,path,length);
	}
}

async function saveHistory(name) {
	try {
		const timestamp=Math.floor(Date.now()/1000).toString(16);
		const filename=(name||"transmission-"+timestamp)+".json";
		const filePath=resolve(forgePath,filename);
		const line="Saved session "+filename+".";
//		rohaHistory.push({role:"system",title:"Fountain History Saved",content:line});
		rohaHistory.push({role:"system",title:"saveHistory",content:line});
		await Deno.writeTextFile(filePath,JSON.stringify(rohaHistory,null,"\t"));
		echo(line);
		roha.saves.push(filename);
		await writeForge();
	} catch (error) {
		echo("[FOUNTAIN] History save error",error.message);
	}
}

async function loadHistory(filename){
	let history;
	try {
		const fileContent=await Deno.readTextFile(filename);
		history=JSON.parse(fileContent);
		echo("History restored from",filename);
	} catch (error) {
//		console.error("Error restoring history:", error.message);
		echo("[FOUNTAIN] loadHistory error",error.message);
		resetHistory()
	}
	return history;
}


function stripAnsi(text) {
	return text.replace(/\x1B\[\d+(;\d+)*[mK]/g, "");
}

// Array of 8 ANSI colors (codes 30-37) selected for contrast and visibility in both light and dark modes.
const ansiColors=[
	"\x1b[30m", // Black: Deep black (#333333), subtle on light, visible on dark
	"\x1b[31m", // Red: Muted red (#CC3333), clear on white and black
	"\x1b[32m", // Green: Forest green (#2D6A4F), good contrast on both
	"\x1b[33m", // Yellow: Golden yellow (#DAA520), readable on dark and light
	"\x1b[34m", // Blue: Medium blue (#3366CC), balanced visibility
	"\x1b[35m", // Magenta: Soft magenta (#AA3377), distinct on any background
	"\x1b[36m", // Cyan: Teal cyan (#008080), contrasts well without glare
	"\x1b[37m"	// White: Light gray (#CCCCCC), subtle on light, clear on dark
];

function ansiStyle(text, style="bold", colorIndex=null) {
	if (!roha.config.ansi) return text;
	let formatted=text;
	switch (style.toLowerCase()) {
		case "bold": formatted="\x1b[1m" + formatted + "\x1b[0m"; break;
		case "italic": formatted="\x1b[3m" + formatted + "\x1b[0m"; break;
		case "underline": formatted="\x1b[4m" + formatted + "\x1b[0m"; break;
	}
	if (!Deno.noColor && colorIndex !== null && colorIndex >= 0 && colorIndex < ansiColors.length) {
		formatted=ansiColors[colorIndex] + formatted + "\x1b[0m";
	}
	return formatted;
}

const ansiWhite="\x1b[38;5;255m";
const ansiNeonPink="\x1b[38;5;201m";
const ansiVividOrange="\x1b[38;5;208m";

const ansiGreenBG="\x1b[48;5;23m";
const ansiTealBG="\x1b[48;5;24m";
const ansiGreyBG="\x1b[48;5;232m";
const ansiReset="\x1b[0m";

const ansiCodeTitle=ansiTealBG+ansiVividOrange;
const ansiCodeBlock=ansiGreenBG+ansiWhite;
const ansiReplyBlock=ansiGreyBG;
const ansiStatusBlock=ansiGreyBG;

const ansiPop="\x1b[1;36m";

const ansiMoveToEnd="\x1b[999B";
const saveCursor=new Uint8Array([27,91,115]);
const restoreCursor=new Uint8Array([27,91,117]);

const homeCursor=new Uint8Array([27, 91, 72]);
const disableScroll=new Uint8Array([27, 91, 55, 59, 49, 59, 114]);
const restoreScroll=new Uint8Array([27, 91, 114]);


// box drawing code

const TopLeft=0;
const TopRight=1;
const BottomLeft=2;
const BottomRight=3;
const Horizontal=4;
const HorizontalDown=5;
const HorizontalUp=6;
const Vertical=7;
const VerticalLeft=8;
const VerticalRight=9;
const Cross=10;

function boxTop(widths){
	const box=boxChars[0];
	const h=box.charAt(Horizontal);
	const hd=box.charAt(HorizontalDown);
	const tl=box.charAt(TopLeft);
	const tr=box.charAt(TopRight);
	const bits=[];
	for(const wid of widths){
		const n=wid.length;
		bits.push(h.repeat(n));
	}
	return tl+bits.join(hd)+tr;
}

// dash: "---- ---- ---- ----"
// array: [1,2,0.3]
// result: 1.00 2.00 0.30
function dashString(dash,array){
	const dashes=dash.split(" ");
	return array.map((v, i) => {
		const w = dashes[i]?.length ?? 1;
		const ch = ['-', '·'][i % 2] || '-'; // simple pattern; extend as needed
		const n  = Math.round(v * w);
		return ch.repeat(Math.max(0, n));
	});
}

function boxCells(widths,cells){
	const box=boxChars[0];
	const v=box.charAt(Vertical);
	const bits=[];
	for(let i=0;i<widths.length;i++){
		const w=widths[i].length;
		const c=cells[i];
		const value=(Array.isArray(c))?dashString(widths[i],c):(c||"");
// todo: clip string for tables or go multi line cells?
		const indent=(w>2)?" ":"";
		const cell=indent+value;
		const wide=stringWidth(cell);
		const pads=w-wide;
		const padding=(pads>0)?" ".repeat(pads):"";
		bits.push(cell+padding);
	}
	return v+bits.join(v)+v;
}

function boxSplit(widths){
	const box=boxChars[0];
	const h=box.charAt(Horizontal);
	const x=box.charAt(Cross);
	const vr=box.charAt(VerticalRight);
	const vl=box.charAt(VerticalLeft);
	const bits=[];
	for(let i=0;i<widths.length;i++){
		const w=widths[i].length;
		bits.push(h.repeat(w));
	}
	return vr+bits.join(x)+vl;
}

function boxBottom(widths){
	const box=boxChars[0];
	const h=box.charAt(Horizontal);
	const hu=box.charAt(HorizontalUp);
	const bl=box.charAt(BottomLeft);
	const br=box.charAt(BottomRight);
	const bits=[];
	for(const wid of widths){
		const n=wid.length;
		bits.push(h.repeat(n));
	}
	return bl+bits.join(hu)+br;
}

const rohaPrompt=">";
let colorCycle=0;

// warning - do not call echo from here

function mdToAnsi(md) {
	const broken=roha.config.broken;
	const lines=md.split("\n");
	let inCode=false;
	let inTable=false;
	let headings=[];
	let widths=[];
	const result=broken?[ansiReplyBlock]:[];
	let poplast=false;
	for (let line of lines) {
		line=line.trimEnd();
		const trim=line.trim();
		poplast=line.length==0;
		if (trim.startsWith("```")) {
			inCode=!inCode;
			if(inCode){
				const codeType=trim.substring(3).trim();
				result.push(ansiCodeBlock);
				if(roha.config.debugging&&codeType) print("inCode codetype:",codeType,"line:",line);
			}else{
				result.push(ansiReset);
				if (broken) result.push(ansiReplyBlock);
			}
		}else{
			if (!inCode) {
				// rules
				if(line.startsWith("---")||line.startsWith("***")||line.startsWith("___")){
					line=pageBreak.substring(0,terminalColumns-1);
				}
				if(line.startsWith("|")){
					if(headings.length&&widths.length){
						result.push(boxSplit(widths));
						headings=[];
					}
					const split=line.split("|");
					const splits=split.length;
					if(splits>2){
						let trim=split.slice(1,splits-1);
						if(!inTable) {
							inTable=true;
							headings=trim;
							continue;
						}else{
							const spacer=(trim[0]||"").startsWith("-");
							if(spacer){
								widths=trim;
								result.push(boxTop(widths));
								let wide=0;
								for(let i=0;i<widths.length;i++){
									const w=widths[i].length;
									wide+=w+1;
								}
								trim=headings;
							}
							if(widths){
								line=boxCells(widths,trim);
							}
						}
					}
				}else{
					if(inTable) {
						result.push(boxBottom(widths));
						inTable=false;
						headings=[];
						widths=[];
					}
				}
				// headershow
				const header=line.match(/^#+/);
				if (header) {
					const level=header[0].length;
					line=line.substring(level).trim();
					const ink=Deno.noColor?"":ansiColors[(colorCycle++)&7];
					line=ink + line + ansiReset;	//ansiPop
				}
				// bullets
				if (line.startsWith("*") || line.startsWith("+")) {
					line="• " + line.substring(1).trim();
				}
				// bold
				if (line.includes("**")) {
					line=line.replace(/\*\*(.*?)\*\*/g, "\x1b[1m$1\x1b[0m");
				}
				// italic
				line=line.replace(/\*(.*?)\*/g, "\x1b[3m$1\x1b[0m");
				line=line.replace(/_(.*?)_/g, "\x1b[3m$1\x1b[0m");
				// wordwrap
				line=wordWrap(line,terminalColumns);
			}
			result.push(line.trimEnd());
		}
	}
	if(poplast){
		result.pop();
	}

	if(inTable&&widths) {
		result.push(boxBottom(widths));
	}

	result.push(ansiReset);
	return result.join("\n");
}

async function hashFile(filePath) {
	const buffer=await Deno.readFile(filePath);
	const hash=await crypto.subtle.digest("SHA-256", buffer);
	const bytes=new Uint8Array(hash);
	return Array.from(bytes, (byte) =>
		byte.toString(16).padStart(2, "0")
	).join("");
}

async function readForge(){
	try {
		const fileContent=await Deno.readTextFile(rohaPath);
		roha=JSON.parse(fileContent);
		if(!roha.saves) roha.saves=[];
		if(!roha.counters) roha.counters={};
		if(!roha.mut) roha.mut={};
		if(!roha.forge) roha.forge=[];
		if(!roha.lode) roha.lode={};
		if(!roha.nic) roha.nic=sanitizeNic(username);
	} catch (error) {
		console.error("Error reading or parsing",rohaPath,error);
		roha=emptyRoha;
	}
}

async function writeForge(){
	try {
		roha.model=grokModel;
		await Deno.writeTextFile(rohaPath, JSON.stringify(roha, null, "\t"));
	} catch (error) {
		console.error("Error writing",rohaPath,error);
	}
}

async function resetRoha(){
	grokTemperature=1.0;
	rohaShares=[];
	roha.sharedFiles=[];
//	roha.tags={};
	if(roha.config.resetcounters) roha.counters={};
	increment("resets");
	await writeForge();
	resetHistory();
	await resetModel(roha.model||defaultModel);
	echo("resetRoha","All shares and history reset.");
}

function resolvePath(dir,filename){
	let path=resolve(dir,filename);
	path=path.replace(/\\/g, "/");
	return path;
}

// a raw mode prompt replacement
// roha.config.rawprompt is not default
// arrow navigation and tab completion incoming
// a reminder to enable rawprompt for new modes

const reader=Deno.stdin.readable.getReader();
const writer=Deno.stdout.writable.getWriter();

let promptBuffer=new Uint8Array(0);

async function promptForge(message) {
	if(!roha.config.rawprompt) return prompt(message);
	let result="";
	if (message) {
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
	if(roha.config.page) {
		await writer.write(homeCursor);
	}
	Deno.stdin.setRaw(true);
	try {
		let busy=true;
		while (busy) {
			const { value, done }=await reader.read();
			if (done || !value) break;
			let bytes=[];
			for (const byte of value) {
				if (byte === 0x7F || byte === 0x08) { // Backspace
					if (promptBuffer.length > 0) {
						promptBuffer=promptBuffer.slice(0, -1);
						bytes.push(0x08, 0x20, 0x08);
					}
				} else if (byte === 0x1b) { // Escape sequence
					if (value.length === 1) {
						await exitForge();
						Deno.exit(0);
					}
					if (value.length === 3) {
						if (value[1] === 0xf4 && value[2] === 0x50) {
							echo("F1");
						}
					}
					break;
				} else if (byte === 0x0A || byte === 0x0D) { // Enter key
					bytes.push(0x0D, 0x0A);
					const line=decoder.decode(promptBuffer);
					let n=line.length;
					if (n > 0) {
						promptBuffer=promptBuffer.slice(n);
					}
					result=line.trimEnd();
					await log(result, "stdin");
					busy=false;
				} else {
					bytes.push(byte);
					const buf=new Uint8Array(promptBuffer.length + 1);
					buf.set(promptBuffer);
					buf[promptBuffer.length]=byte;
					promptBuffer=buf;
				}
			}
			if (bytes.length) await writer.write(new Uint8Array(bytes));
		}
	}catch(e){
		echo("promptForge","threw",e);
	} finally {
		Deno.stdin.setRaw(false);
	}
	if(roha.config.page) await writer.write(homeCursor);
	return result;
}

async function addShare(share){
	share.id="share"+increment("shares");
	roha.sharedFiles.push(share);
	if(share.tag) {
		await setTag(share.tag,share.id);
	}
}

async function shareDir(dir, tag) {
	try {
		const paths=[];
		for await (const file of Deno.readDir(dir)) {
			if (file.isFile && !file.name.startsWith(".")) {
				paths.push(resolvePath(dir, file.name));
			}
		}
		for (const path of paths) {
			try {
				echo("Sharing",path);
				const stat=await Deno.stat(path);
				const size=stat.size||0;
				const modified=stat.mtime.getTime();
				const hash=await hashFile(path);
				await addShare({ path, size, modified, hash, tag });
			} catch (error) {
				echo("[FOUNTAIN] shareDir error",path,error.message);
				continue;
			}
		}
		await writeForge();
		echo("Shared",paths.length,"files from",dir,"with tag",tag);
	} catch (error) {
		echo("shareDir error",String(error)); //.message
		throw error;
	}
}

function fileType(extension){
	return contentType(extension) || "application/octet-stream";
}

function annotateCode(name,description){
	echo("annotateCode",name,description);
}

const imageExtensions=[
	"jpg","jpeg","png"
];

const textExtensions=[
	"js", "ts", "txt", "json", "md",
	"css","html", "svg",
	"cpp", "c", "h", "cs",
	"sh", "bat",
	"log","py","csv","xml","ini"
];

async function shareBlob(path,size,tag){
	const extension=path.split(".").pop().toLowerCase();
	const mimeType=fileType(extension);
	const metadata=JSON.stringify({ path:path,length:size,type:mimeType,tag });
	rohaPush(metadata,"blob");
	// TODO: test for imageExtensions
	if (textExtensions.includes(extension)) {
		const content=await Deno.readTextFile(path);
		rohaPush(content,"content");
	} else {
		const data=await Deno.readFile(path);
		const base64=encodeBase64(data);
		rohaPush(base64,"image");
	}
	return true;
}

async function commitShares(tag) {
	let count=0;
	let dirty=false;
	const validShares=[];
	const removedPaths=[];
	for (const share of roha.sharedFiles) {
		if (tag && share.tag !== tag) {
			validShares.push(share);
			continue;
		}
		try {
			const path=share.path;
			const stat=await Deno.stat(path);
			const size=stat.size;
			if (!stat.isFile || size > MaxFileSize) {
				removedPaths.push(path);
				echo("Removed invalid path",path);
				dirty=true;
				continue;
			}
			const modified=share.modified !== stat.mtime.getTime();
			const isShared=rohaShares.includes(path);
			if (modified || !isShared) {
				let ok=await shareBlob(path,size,tag);
				if(ok){
					count++;
					share.modified=stat.mtime.getTime();
					dirty=true;
					if (!rohaShares.includes(path)) {
						rohaShares.push(path);
						if(roha.config.verbose){
							echo("Shared path",path);
						}
					}else{
						echo("Updated share path",path);
					}
				}
			}
			validShares.push(share);
		} catch (error) {
			if (error instanceof Deno.errors.NotFound || error instanceof Deno.errors.PermissionDenied) {
				removedPaths.push(share.path);
				dirty=true;
			}
			echo("[FOUNTAIN] commitShares path",share.path);
			echo("[FOUNTAIN] commitShares error",error.message);
		}
	}
	if (removedPaths.length) {
		roha.sharedFiles=validShares;
		await writeForge();
		echo("[FOUNTAIN] commitShares removed", removedPaths.join(" "));
	}
	if (dirty && tag) {
		rohaHistory.push({ role: "system", title:"Fountain Tool Hint", content: "Feel free to call annotate_forge to tag " + tag });
	}
	if (count && roha.config.verbose) {
		echo("[FOUNTAIN] Updated files",count,"of",validShares.length);
	}
	return dirty;
}

async function setTag(name,note){
	const tags=roha.tags||{};
	const tag=(tags[name])?tags[name]:{name,info:[]};
	tag.info.push(note);
	tags[name]=tag;
	roha.tags=tags;
	await writeForge();
//	let invoke=`New tag "${name}" added. Describe all shares with this tag.`;
//	rohaHistory.push({role:"system",content:invoke});
}
function listCounters(){
	let keys=Object.keys(roha.counters);
	let i=0;
	for(let key of keys){
		let count=roha.counters[key];
		echo((i++),key,count);
	}
}
function listTags(){
	let tags=roha.tags||{};
	let keys=Object.keys(tags);
	let list=[];
	let n=keys.length||0;
	for(let i=0;i<n;i++){
		let tag=tags[keys[i]];
		const name=tag.name||"?????";
		if(tag.info){
			echo(i,name,"("+tag.info.length+")");
		}else{
			echo(i,name);
		}
		let info=tag.description;
		if(info) echo("",info);
		list.push(name);
	}
	tagList=list;
}

async function openWithDefaultApp(path) {
	const cmd=Deno.build.os === "windows" ? ["start", "", path] : Deno.build.os === "darwin" ? ["open", path] : ["xdg-open", path];
	await Deno.run({ cmd }).status();
}

function onForge(args){
	let list=roha.forge;
	if(args.length>1){
		let name=args.slice(1).join(" ");
		if(name.length && !isNaN(name)) {
			let item=list[name|0];
			echo("opening",item.name,"from",item.path);
			openWithDefaultApp(item.path);
		}
	}else{
		for(let i=0;i<list.length;i++){
			echo(i,list[i].name);
		}
		listCommand="forge";
	}
}

async function creditAccount(credit,account){
	const amount=Number(credit);
	const lode=roha.lode[account];
	const current=lode.credit||0;
	lode.credit=amount;
	if(roha.config.verbose) {
		const delta=(current-amount).toFixed(2);
		echo("creditAccount",price(amount),account,"balance",price(lode.credit),"delta",delta);
	}
	await writeForge();
}

async function onAccount(args){
	if(args.length>1){
		let name=args.slice(1).join(" ");
		if(name.length && !isNaN(name)) {
			name=lodeList[name|0];
		}
		specAccount(name);
		const lode=roha.lode[name];
		const balance=lode.credit||0;
		echo("Adjust",lode.name,"balance",price(balance));
		creditCommand=(credit)=>creditAccount(credit,name);
		await writeForge();
	}else{
		const list=[];
		for(const key in modelAccounts){
			list.push(key);
		}
		echo_row("id","name","llm","🇦🇮","credit");
		echo_row("----","-------------","----","----------");
		for(let i=0;i<list.length;i++){
			const key=list[i];
			if(key in roha.lode){
				const endpoint=rohaEndpoint[key];
				const models=endpoint?.modelList||[];
				const lode=roha.lode[key];
				const count=models?.length|0;
				echo_row(i,key,count,price(lode.credit));
			}else{
				echo_row(i,key);
			}
			lodeList=list;
			listCommand="credit";
		}
	}
}

async function showHelp() {
	try {
		const md=await Deno.readTextFile("forge.md");
		echo(mdToAnsi(md));
	} catch (e) {
		echo("showHelp error",e.message);
	}
}

function readable(text){
	text=text.replace(/\s+/g, " ");
	return text;
}


function listShares(shares){
	const list=[];
	let count=0;
	let sorted=shares.slice();
	sorted.sort((a, b) => b.size - a.size);
	for (const share of sorted) {
		let shared=(rohaShares.includes(share.path))?"*":"";
		let tags="["+rohaTitle+" "+share.tag+"]";
		let info=(share.description)?share.description:"";
		echo((count++),share.path,share.size,shared,tags,info);
		list.push(share.id);
	}
	shareList=list;
}

async function attachMedia(words){
	if (words.length==1){
		listShares(roha.attachedFiles);
	}else{
		const filename=words.slice(1).join(" ");
		const path=resolvePath(Deno.cwd(), filename);
		const stat=await Deno.stat(path);
		const tag="";//await promptForge("Enter tag name (optional):");
		if(stat.isFile){
			const size=stat.size;
			const modified=stat.mtime.getTime();
			echo("Attach media path:",path,"size:",size);
//			const hash=await hashFile(path,size);
//			echo("hash:",hash);
//			await addShare({path,size,modified,hash,tag});
		}
		await writeForge();
	}
}

async function callCommand(command) {
	let dirty=false;
	let words=command.split(" ");
	try {
		switch (words[0]) {
			case "spec":
				parseUnicode();
				break;
			case "listen":
				listenService();
				break;
			case "think":
				if (words.length > 1) {
					const newThink=parseFloat(words[1]);
					if (!isNaN(newThink) && newThink >= 0 && newThink <= 8192) {
						grokThink=newThink;
					}
				}
				echo("Current model thinking budget is", grokThink);
				break;
			case "temp":
				if (words.length > 1) {
					const newTemp=parseFloat(words[1]);
					if (!isNaN(newTemp) && newTemp >= -5 && newTemp <= 50) {
						grokTemperature=newTemp;
					}
				}
				echo("Current model temperature is", grokTemperature);
				break;
			case "balance":
				await getBalance(words);
				break;
			case "forge":
				onForge(words);
				break;
			case "counter":
				listCounters();
				break;
			case "tag":
				await listTags();
				break;
			case "account":
			case "credit":
				await onAccount(words);
				break;
			case "help":
				await showHelp();
				break;
			case "nic":{
					if(words.length>1){
						const nic=sanitizeNic(words[1].trim()||"nix");
						roha.config.nic=nic;
						rohaNic=nic;
					}else{
						echo(roha.config.nic);
					}
				}
				break;
			case "config":
				if(words.length>1){
					let flag=words[1].trim();
					if(flag.length && !isNaN(flag)){
						flag=Object.keys(flagNames)[flag|0];
						echo("flag",flag);
					}
					if(flag in flagNames){
						roha.config[flag]=!roha.config[flag];
						echo(flag+" - "+flagNames[flag]+" is "+(roha.config[flag]?"true":"false"));
						await writeForge();
					}
				}else{
					let count=0;
					for(let flag in flagNames){
						echo((count++),flag,":",flagNames[flag],":",(roha.config[flag]?"true":"false"))
					}
					listCommand="config";
				}
				break;
			case "time":
				echo("Current time:", new Date().toString());
				break;
			case "log":
				logHistory();
				break;
			case "list":
			case "history":
				listHistory();
				break;
			case "load":{
					let save=words[1];
					if(save){
						if(save.length && !isNaN(save)) save=roha.saves[save|0];
						if(roha.saves.includes(save)){
							echo("loading",save);
							const path="forge/"+save;
							let load=await loadHistory(path);
							rohaHistory=load;
							echo("rohaHistory <= ",save);
						}
					}else{
						await listSaves();
					}
				}
				break;
			case "save":{
					const savename=words.slice(1).join(" ");
					await saveHistory(savename);
				}
				break;
			case "note":
				// todo roha.mut[] -> roha.mutspec[]
				if(grokModel in roha.mut){
					const mutspec=roha.mut[grokModel];
					const note=words.slice(1).join(" ");
					if(note.length){
						mutspec.notes.push(note);
						await writeForge();
					}else{
						const n=mutspec.notes.length;
						for(let i=0;i<n;i++){
							echo(i,mutspec.notes[i]);
						}
					}
				}
				break;
			case "dump":
				for(let i=0;i<modelList.length;i++){
					let name=modelList[i];
					if(name in modelSpecs){
						echo(name);
						aboutModel(name);
						echo(".");
					}
				}
				break;
			case "model":{
				// TODO: refactor this gigantic block
					let name=words[1];
					if(name && name!="all"){
						if(name.length&&!isNaN(name)) name=modelList[name|0];
						if(modelList.includes(name)){
							await resetModel(name);
							await writeForge();
						}
					}else{
						echo_row("id","☐","model name","📆","🧮","💰","🪣🧊🫐🪨");
						echo_row("-----","--","-----------------------","-----","---- ---- ---- ---- ----","------","-----------------");
						const all=(name && name=="all");
						for(let i=0;i<modelList.length;i++){
							const modelname=modelList[i];
							// todo: ⭐power
							const attr=(modelname==grokModel)?"☑":" ";
							// mutspec from roha.mut
							const mutspec=(modelname in roha.mut)?roha.mut[modelname]:{...emptyMUT};
							mutspec.name=modelname;
							const notes=[...mutspec.notes];
							if(mutspec.hasForge) notes.push("🪣");
							const rated=modelname in modelSpecs?modelSpecs[modelname]:{};
							if(rated.cold) notes.push("🧊");
							if(rated.multi) notes.push("🫐");
							if(rated.inline) notes.push("Inline");
							if(rated.strict) notes.push("🪨");
							const priced=rated.pricing;
							// account from modelProvder
							const modelProvider=modelname.split("@");
							const provider=modelProvider[1];
							const account=modelAccounts[provider];
							const emoji=account.emoji||"";
							const mut=mutName(modelname);
							if(priced || all){
								const pricing=(rated&&rated.pricing)?JSON.stringify(rated.pricing):"";
								// todo: verbose use modelname
//								echo(i,attr,emoji,mut,"{"+notes.join(",")+"}",mutspec.relays|0,pricing);
								echo_row(i,attr,mut,mutspec.relays|0,pricing,emoji,notes.join(" "));
							}
						}
						listCommand="model";
					}
				}
				break;
			case "begin":
				await pushHistory();
				break;
			case "finish":{
					let ok=await popHistory();
					if(!ok){
						echo("trigger exit here");
					}
				}
				break;
			case "reset":
				await resetRoha();
				break;
			case "cd":
				if(words.length>1){
					const newDir=words[1];
					if (newDir.length) Deno.chdir(newDir);
				}
				currentDir=Deno.cwd();
				echo("Changed directory to", currentDir);
				break;
			case "dir":{
					const cwd=words.slice(1).join(" ")||currentDir;
					echo("Directory",cwd);
					const dirs=[];
					const files=[];
					for await (const file of Deno.readDir(cwd)) {
						const name=file.name;
						if(file.isDirectory)dirs.push(name);else files.push(name);
					}
					if(dirs) echo("dirs",dirs.join(" "));
					if(files) echo("files",files.join(" "));
				}
				break;
			case "drop":
				dropShares();
				await writeForge();
				break;
			case "attach":
			case "share":
				if (words.length==1){
					listShare();
				}else{
					const filename=words.slice(1).join(" ");
					const path=resolvePath(Deno.cwd(), filename);
					const stat=await Deno.stat(path);
					const tag="";//await promptForge("Enter tag name (optional):");
					if(stat.isDirectory){
						echo("Share directory path:",path);
						await shareDir(path,tag);
					}else{
						// attachMedia(words);
						const size=stat.size;
						const modified=stat.mtime.getTime();
						echo("Share file path:",path," size:",size," ");
						const hash=await hashFile(path,size);
						echo("hash:",hash);
						await addShare({path,size,modified,hash,tag});
					}
					await writeForge();
				}
				break;
			case "push":
			case "commit":{
					let tag="";
					if(words.length>1){
						tag=words[1];
					}
					dirty=await commitShares(tag);
				}
				break;
			default:
				echo("Command not recognised",words[0]);
				return false; // Command not recognized
		}
	} catch (error) {
		echo("[FOUNTAIN] callCommand error",command,error.message,error.stack);
	}
	increment("calls");
	return dirty;
}

async function pathExists(path) {
	try {
		const stat=await Deno.stat(path);
//		if (!stat.isFile) return false;
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		if (error instanceof Deno.errors.PermissionDenied) return false;
		throw error;
	}
}

function extensionForType(contentType) {
	if (contentType.includes("html")) return ".html";
	if (contentType.includes("markdown")) return ".md";
	if (contentType.includes("json")) return ".json";
	if (contentType.includes("javascript")) return ".js";
	if (contentType.includes("typescript")) return ".ts";
	return ".txt";
}

async function onCall(toolCall) {
	let verbose=roha.config.verbose;
	let name=toolCall.function.name;
	switch(name) {
		case "read_time":{
			const time=new Date().toLocaleString();
			const tz=userregion.timeZone;
			const locale=userregion.locale;
			return {time,tz,locale};
		}
		case "submit_file":{
			let args=JSON.parse(toolCall.function.arguments);
			echo(args.contentType);
			if (verbose) echo(args.content);
			let timestamp=Math.floor(Date.now()/1000).toString(16);
			let extension=extensionForType(args.contentType)
			let name= "submission-"+timestamp+extension;
			let filePath=resolve(forgePath,name);
			await Deno.writeTextFile(filePath, args.content);
			echo("File saved to:", filePath);
			roha.forge.push({name,path:filePath,type:args.contentType});
			return { success: true, path: filePath };
		}
		case "fetch_file":{
			const { fileName }=JSON.parse(toolCall.function.arguments || "{}");
			echo("Fetching file:", fileName);
			const path="forge/"+fileName;
			const data=await Deno.readFile(path);
			const base64=encodeBase64(data);
			return { success: true, path: fileName, Base64:base64 };
		}
		case "annotate_forge":{
			try {
				const { name, type, description }=JSON.parse(toolCall.function.arguments || "{}");
				switch(type){
					case "code":
						annotateCode(name,description);
						break;
					case "tag":
						annotateTag(name,description);
						break;
					case "share":
						annotateShare(name,description);
						break;
				}
				await writeForge(); // Persist changes
				return { success: true, updated: 1 };
			} catch (error) {
				echo("annotate_forge error:",error);
			}
			return { success: false, updated: 0 };
		}
		default:
			echo("onCall unhandled function name:",name);
			debug("toolCall",toolCall);
			return { success: false, updated: 0 };
	}
}

function squashMessages(history) {
	if (history.length < 2) return history;
	const squashed=[];
	const system=[];
	const others=[];
	for(const item of history){
		if(item.role=="system") system.push(item); else others.push(item);
	}
	for(const list of [[...system],[...others]]){
		let last=null;
		for (let i=0; i < list.length; i++) {
			const current=list[i];
			if(last && last.role==current.role){
				last.content += "\n" + current.content;
			} else {
				squashed.push(current);
				last=current;
			}
		}
	}
	return squashed;
}

async function processToolCalls(calls) {
	const results=[];
	for (const tool of calls) {
		const id=tool.id || !tool.function?.name
		echo("[RELAY] processToolCalls",id,tool);
		if (!tool.id || !tool.function?.name) {
			results.push({
				tool_call_id: tool.id || "unknown",
				name: tool.function?.name || "unknown",
				content: JSON.stringify({error: "Invalid tool call format"})
			});
			await log("processToolCalls error");
			//Invalid tool call: ${JSON.stringify(tool)}`, "error");
			continue;
		}
		try {
			const result=await onCall(tool);
			results.push({
				// todo: fix for testing kimi
				tool_call_id: tool.id,
				name: tool.function.name,
				content: JSON.stringify(result || {success: false})
			});
		} catch (e) {
			echo("processToolCalls] error",e);
/*
			results.push({
				tool_call_id: tool.id,
				name: tool.function.name,
				content: JSON.stringify({error: e.message})
			});
			await log("processToolCalls failure");
*/
			//`Tool call failed: ${tool.function.name} - ${e.message}`, "error");
		}
	}
	return results;
}

function strictHistory(history){
	const list=[];
	for(const _item of history){
		const item={..._item};
		switch(item.role){
			case "system":
				list.push({role:"system",content:item.content});
				break;
			case "assistant":
				if(item.tool_calls){
					list.push({role:item.role,content:item.content,tool_calls:item.tool_calls});
				}else{
					list.push({role:"assistant",content:item.content});
				}
				break;
			case "user":{
					const content="["+item.name+"] "+item.content;
					list.push({role:item.role,content});
				}
				break;
			case "tool":
				list.push({...item});
				//({role:"tool",tool_call_id:result.tool_call_id,name:result.name,content:result.content});
				break;
		}
	}
	return list;
}

function multiHistory(history){
	const list=[];
	let blobType="";
	for(const _item of history){
		const item={..._item};
		switch(item.role){
			case "system":
				list.push({role:"system",content:item.content});
				break;
			case "assistant":
				if(item.tool_calls){
					list.push({role:item.role,content:item.content,tool_calls:item.tool_calls});
				}else{
					list.push({role:"assistant",content:item.content});
				}
				break;
			case "user":{
					if(item.name=="blob"){
						const blob=JSON.parse(item.content);
						blobType=blob.type;
						continue;
					}
					if(item.name=="image"){
						const type=blobType.toLocaleLowerCase();
						if(type=="image/jpeg"||type=="image/png"){
							const url="data:"+type+";base64,"+item.content;
							const detail="high";
							const content=[{type:"image_url",image_url:{url,detail}}];
							list.push({role:item.role,content});
							echo("[MULTI] image_url content attached to payload");
							continue;
						}

					}
					if(item.name=="content"){
						// TODO: support other encodings
					}
					const name=item.name||"anon";
					const text="["+name+"] "+item.content;
					const content=[{type:"text",text}];
					list.push({role:item.role,content});
				}
				break;
			case "tool":
				// TODO: tool result history is ok
				list.push({...item});
				//({role:"tool",tool_call_id:result.tool_call_id,name:result.name,content:result.content});
				break;
		}
	}
	return list;
}


function inlineHistory(history){
	const list=[];
	let blobType="";
	for(const _item of history){
		const item={..._item};
		switch(item.role){
			case "system":
				list.push({role:"system",content:item.content});
				break;
			case "assistant":
				if(item.tool_calls){
					list.push({role:item.role,content:item.content,tool_calls:item.tool_calls});
				}else{
					list.push({role:"assistant",content:item.content});
				}
				break;
			case "user":{
					if(item.name=="blob"){
						const blob=JSON.parse(item.content);
						blobType=blob.type;
						continue;
					}
					if(item.name=="image"){
						const type=blobType.toLocaleLowerCase();
						if(type=="image/jpeg"||type=="image/png"){
							const contents=[{parts:[{inlineData:{mimeType:type,data:item.content}}]}];
							list.push({role:"user",contents});
							continue;
						}

					}
					if(item.name=="content"){
						// TODO: support other encodings
					}
					const name=item.name||"anon";
					const text="["+name+"] "+item.content;
					const content=[{type:"text",text}];
					list.push({role:item.role,content});
				}
				break;
			case "tool":
				// TODO: tool result history is ok
				list.push({...item});
				//({role:"tool",tool_call_id:result.tool_call_id,name:result.name,content:result.content});
				break;
		}
	}
	return list;
}


// fountain relay
// returns spend
// warning - tool_calls resolved with recursion

async function relay(depth) {
	const now=performance.now();
	const verbose=roha.config.verbose;
	const info=(grokModel in modelSpecs)?modelSpecs[grokModel]:null;
	const strictMode=info&&info.strict;
	const multiMode=info&&info.multi;
	const inlineMode=info&&info.inline;
	const modelAccount=grokModel.split("@");
	const model=modelAccount[0];
	const account=modelAccount[1];
	const endpoint=rohaEndpoint[account];
	const config=modelAccounts[account];
	const mut=mutName(model);
	let payload={model,mut};
	let spend=0;
	let elapsed=0;
//	if(verbose)echo("[RELAY] ",depth,mut);
	try {
	// prepare payload
		payload={model};
		if(strictMode){
			payload.messages=strictHistory(rohaHistory);
		}else if(multiMode){
			// warning - not compatible with google generative ai api
			payload.messages=multiHistory(rohaHistory)
		}else{
			payload.messages=[...rohaHistory];
		}
	// use tools
		const useTools=grokFunctions&&roha.config.tools;
		if(useTools){
			payload.tools=rohaTools;
		}
	// check cold:true in o4-mini-2025-04-16@openai before enabling temperature
		if(info && !info.cold){
			payload.temperature=grokTemperature;
		}
		if(info && info.max_tokens){
			payload.max_tokens=info.max_tokens;
		}
		if(info && info.pricing.length>3 && grokThink>0){
			payload.config={thinkingConfig:{thinkingBudget:grokThink}};
		}
		if(roha.config.debugging){
			echo("[RELAY] payload",JSON.stringify(payload,null,"\t"));
		}

		// [RELAY] endpoint chat completions.create

		const completion=await endpoint.chat.completions.create(payload);
		elapsed=(performance.now()-now)/1000;

		// if(config.hasCache) payload.cache_tokens=true;

		// TODO: detect -latest modelnames rerouting to real instances
		if (completion.model != model) {
			echo("[RELAY] model reset",completion.model||"???",model);
			const name=completion.model+"@"+account;
			resetModel(name);
		}
		if (verbose) {
			// echo("relay completion:" + JSON.stringify(completion, null, "\t"));
		}
		// const system=completion.system_fingerprint;
		const usage=completion.usage;
		const size=measure(rohaHistory);
		const spent=[usage.prompt_tokens | 0,usage.completion_tokens | 0];
		const emoji=config?(config.emoji||""):"";
		grokUsage += spent[0]+spent[1];
		// echo("[relay] debugging spend 0",grokModel,usage);
		// todo: roha.mut[] -> roha.mutspec[]
		if(grokModel in roha.mut){
			const mutspec=roha.mut[grokModel];
			mutspec.relays=(mutspec.relays || 0) + 1;
			mutspec.elapsed=(mutspec.elapsed || 0) + elapsed;
			// echo("debugging spend 1",grokModel);
			if(grokModel in modelSpecs){
				const rate=modelSpecs[grokModel].pricing||[0,0];
				const tokenRate=rate[0];
				const outputRate=rate[rate.length>2?2:1];
				if(rate.length>2){
					const cacheRate=rate[1];
					const cached=usage.prompt_tokens_details?(usage.prompt_tokens_details.cached_tokens||0):0;
					spend=spent[0]*tokenRate/1e6+spent[1]*outputRate/1e6+cached*cacheRate/1e6;

				}else{
					spend=spent[0]*tokenRate/1e6+spent[1]*outputRate/1e6;
				}
				mutspec.cost+=spend;
				const lode=roha.lode[account];
				if(lode) {
					const credit=lode.credit||0;
					lode.credit=credit-spend;
					if (verbose) {
						const summary="{account:"+account+",spent:"+spend.toFixed(4)+",balance:"+(lode.credit).toFixed(4)+"}";
						echo(summary);
					}
				}else{
					echo("no lode for account",account);
				}
				await writeForge();
			}else{
				if(verbose){
					echo("modelSpecs not found for",grokModel);
				}
			}
			mutspec.prompt_tokens=(mutspec.prompt_tokens|0)+spent[0];
			mutspec.completion_tokens=(mutspec.completion_tokens|0)+spent[1];
			// TODO: explain hasForge false condition
			if(useTools && mutspec.hasForge!==true){
				echo("[RELAY] enabling forge for",mut);
				mutspec.hasForge=true;
				await writeForge();
			}
		}else{
			echo("debugging spend 2");
		}

		const details=(usage.prompt_tokens_details)?JSON.stringify(usage.prompt_tokens_details):"";

//		if(usage.prompt_tokens_details) echo(JSON.stringify(usage.prompt_tokens_details));
//		if(usage.prompt_tokens_details) echo(JSON.stringify(usage));

		let cost="("+usage.prompt_tokens+"+"+usage.completion_tokens+"["+grokUsage+"])";
		if(spend) {
			cost="$"+spend.toFixed(3);
		}

		// ansiStatusBlock status bar
		const echostatus=(depth==0);
		if(echostatus){
			const temp=grokTemperature.toFixed(1)+"°";
			const forge = roha.config.tools? (grokFunctions ? "🪣" : "🐸") : "🪠";
			const modelSpec=[rohaTitle,rohaModel,emoji,grokModel,temp,forge,cost,size,elapsed.toFixed(2)+"s"];
			const status=" "+modelSpec.join(" ")+" ";
			if (roha.config.ansi)
				echo(ansiStatusBlock+status+ansiReset);
			else
				echo(status);
		}

		const replies=[];
		for (const choice of completion.choices) {
			const calls=choice.message.tool_calls;
			// choice has index message{role,content,refusal,annotations} finish_reason
			if (calls) {
				const count=increment("calls");
				if(verbose) echo("[RELAY] calls in progress",depth,count)
				// TODO: map toolcalls index
				const toolCalls=calls.map((tool, index) => ({
					id: tool.id,
					type: "function",
					function: {name: tool.function.name,arguments: tool.function.arguments || "{}"}
				}));
				const toolResults=await processToolCalls(calls);
				for (const result of toolResults) {
					// kimi does not like this
					// todo: mess with role tool
					// todo: google needs user not assistant
					// todo: use assistant and modify in gemini tools
					const item={role:"assistant",tool_call_id:result.tool_call_id,title:result.name,content:result.content};
					debug("item",item);
					if(verbose)echo("[RELAY] pushing tool result",item);
					rohaHistory.push(item);
				}
				// new behavior, message content comes after tool reports
				const content=choice.message.content;
				if(content){
					if(verbose)echo("[RELAY] pushing asssistant model",depth,payload.model,mut,content);
//					rohaHistory.push({role:"assistant",name:payload.model,mut,content,tool_calls:toolCalls});
				}
				// warning - here be dragons
				const spent=await relay(depth+1); // Recursive call to process tool results
				spend+=spent;
			}

			const reasoning=choice.message.reasoning_content;
			if(reasoning && roha.config.reasonoutloud){
				print("=== reasoning ===");
				// print chain of thought
				if (roha.config.ansi) {
					print(mdToAnsi(reasoning));
				} else {
					print(wordWrap(reasoning));
				}
				print("=================");
			}

			const reply=choice.message.content;
			if(reply){
				if (roha.config.ansi) {
					print(mdToAnsi(reply));
				} else {
					print(wordWrap(reply));
				}
				replies.push(reply);
			}
		}
//		const name=rohaModel||"mut1";
		if(replies.length){
			let content=replies.join("\n<eom>\n");
			rohaHistory.push({role:"assistant",name,mut,emoji,content,elapsed,price:spend});
		}
	} catch (error) {
		const line=error.message || String(error);
		if(line.includes("maximum prompt length")){
			echo("Oops, maximum prompt length exceeded.");
			echo(cleanupRequired);
			return spend;
		}
		if(line.includes("maximum context length")){
			echo("Oops, maximum context length exceeded.");
			echo(cleanupRequired);
			return spend;
		}
		const HuggingFace402="You have exceeded your monthly included credits for Inference Providers. Subscribe to PRO to get 20x more monthly included credits."
		if(line.includes(HuggingFace402)){
			echo("[RELAY] Hugging Face Error depth",depth,line);
			return spend;
		}
		const KimiK2400="Your request exceeded model token limit";
		if(line.includes(KimiK2400)){
			echo("[RELAY] Kimi K2 Error depth",depth,line);
			return spend;
		}
		// error:{"type":"error","error":{"type":"rate_limit_error",
		const err=(error.error&&error.error.error)?error.error.error:{};
		if(err.type=="rate_limit_error"||err.type=="invalid_request_error"){
			echo("Oops.",err.type,err.message);
			echo(cleanupRequired);
			return spend;
		}

		// Unrecognized request argument supplied: cache_tokens
		const NoFunctions400="does not support Function Calling";
		if(grokFunctions){
			if(line.includes(NoFunctions400)){
				if(grokModel in roha.mut) {
					echo("mut",grokModel,"noFunctions",true);
					roha.mut[grokModel].noFunctions=true;
					await writeForge();
				}
				echo("resetting grokFunctions")
				grokFunctions=false;
				return spend;
			}
		}
		//unhandled error line: 400 status code (no body)+
		//Unsupported value: 'temperature' does not support 0.8 with this model.
		// tooling 1 unhandled error line: 400 status code (no body)

		echo("[FOUNTAIN] unhandled error",error.message,JSON.stringify(error.stack));

		//		echo("unhandled error line",line);
		if(verbose){
			echo("[FOUNTAIN] payload",JSON.stringify(payload,null,"\t"));
		}
	}
	return spend;
}

// while true promptForge, callCommand and solicit completion
// note - google and deepseek api provides alternative endpoint for this function

async function chat() {
	dance:
	while (true) {
		const lines=[];
		const images=[];
//		echo(ansiMoveToEnd);
		while (true) {
			await flush();
			let line="";
			if(listCommand){
				line=await promptForge(listCommand+" #");
				if(line.startsWith("//")||!line.startsWith("/")){
					if(line.length&&isFinite(line)){
						let index=line|0;
						await callCommand(listCommand+" "+index);
					}
					listCommand="";
					continue;
				}
				listCommand="";
			}else if(creditCommand){
				line=await promptForge("$");
				if(line.startsWith("//")||!line.startsWith("/")){
					if(line.length&&isFinite(line)){
						await creditCommand(line);
					}
					creditCommand="";
					continue;
				}
				creditCommand="";
			}else{
				line=await promptForge(lines.length?"+":rohaPrompt);
			}
			if (line === "") {
				if(roha.config.returntopush && !lines.length) {
					echo("auto pushing...");
					await callCommand("push");
					await relay(0);
				}
				break;
			}
			if(!line) break;//simon was here
			if (line === "exit") {
				break dance;
			}

			if (line.startsWith("/")&&!line.startsWith("//")) {
				const command=line.substring(1).trim();
				let dirty=await callCommand(command);
				if(dirty){
					lines.push(warnDirty);
					break;
				}
				continue;
			}
			lines.push(line.trim());
			await log(line,rohaUser)
		}

		if (lines.length){
			const query=lines.join("\n");
			if(query.length){
				const info=(grokModel in modelSpecs)?modelSpecs[grokModel]:null;
				const name=rohaNic;//||rohaUser;
				rohaHistory.push({ role: "user", name, content: query });
				await relay(0);
			}
		}
	}
}

const areSame = (arr1, arr2) => {
  return arr1&&arr2&&(arr1.length === arr2.length) && (arr1.every(item => arr2.includes(item)));
};

// forge uses rohaPath to boot

let forgeExists=await pathExists(forgePath);
if(!forgeExists){
	await Deno.mkdir(forgePath);
	echo("Created path",forgePath);
	forgeExists=true;
}
const fileExists=await pathExists(rohaPath);
if (!fileExists) {
	await Deno.writeTextFile(rohaPath, JSON.stringify(emptyRoha));
	echo("Created forge",rohaPath);
}

// forge lists models from active accounts

echo(rohaTitle,"running from "+rohaPath);

await flush();
await readForge();
const rohaEndpoint={};
for(const account in modelAccounts){
	const t=performance.now();
	const endpoint=await connectAccount(account);
	const elapsed=(performance.now()-t)/1000;
	if(endpoint) {
		const count=endpoint.modelList?.length||0;		//",endpoint.modelList
		if(roha.config.verbose){
			echo("[FOUNTAIN] Connected",account,count,elapsed.toFixed(2)+"s");
		}
		rohaEndpoint[account]=endpoint;
		specAccount(account);
		const lode=roha.lode[account];
		if(!areSame(lode.modelList,endpoint.modelList)){
			echo("[FOUNTAIN] modifying modelList");
			lode.modelList=endpoint.modelList;
		}
//		echo("[FOUNTAIN] endpoint modelList",endpoint.modelList);
	}else{
		echo("[FOUNTAIN] Endpoint failure for account",account);
	}
}

// forge starts here, grok started this thing, blame grok

await flush();

let grokModel="";
let grokAccount=null;
let grokFunctions=true;
let grokUsage=0;
let grokTemperature=1.0;
let grokThink=0.0;

resetModel(roha.model||defaultModel);

await flush();
let sessions=increment("sessions");
if(sessions==0||roha.config.showWelcome){
	let welcome=await Deno.readTextFile("welcome.txt");
	echo(welcome);
	await flush();
	await writeForge();
}

if(roha.config){
	if(roha.config.commitonstart) {
		if(roha.config.verbose){
			echo("commitonstart");
		}
		await flush();
		await commitShares();
	}
}else{
	roha.config={};
}
await flush();

if(roha.config.debugging){
	parseUnicode();
}

await flush();

let rohaNic=roha.config.nic||"nic";
let rohaUser=username+"@"+userdomain;
const sharecount=roha.sharedFiles?.length||0;

echo("user:",{nic:rohaNic,user:rohaUser,sharecount,terminal:userterminal})
echo("use /help for latest and exit to quit");
//echo("");

if(roha.config.listenonstart){
	listenService();
}
await flush();

try {
	await chat();
} catch (error) {
	console.error("Slop Fountain has crashed, darn, this release will be stable soon:", error);
	await exitForge();
	Deno.exit(1);
}

await exitForge();
Deno.exit(0);
