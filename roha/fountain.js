// fountain.js
// A research tool for smelting large language models.
// (c)2025 Simon Armstrong

// embeds nitrologic roha foundry forge slop fountain

import { encodeBase64 } from "https://deno.land/std/encoding/base64.ts";
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts";
import { resolve } from "https://deno.land/std/path/mod.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const fountainVersion = "1.2.2";

const terminalColumns=100;

const rohaMihi="Welcome to nitrologic's Slop Fountain, many:many human model research project.";

const rohaGuide=[
	"As a guest assistant LLM please be mindful of others, courteous and professional.",
	"Keep response short and only post code on request.",
	"Tabs not spaces."
]

const rohaTitle="fountain "+fountainVersion;

const username=Deno.env.get("USERNAME");
const userdomain=Deno.env.get("USERDOMAIN");
const rohaUser=username+"@"+userdomain;

const cleanupRequired="Switch model, drop shares or reset history to continue.";
const warnDirty="Please review modified source.";
const exitMessage="Ending session.";

const break50="#+# #+#+# #+#+# #+#+# #+#+# #+#+# #+#+# #+#+# #+# "
const pageBreak=break50+break50+break50;

const slowMillis=25;
const MaxFileSize=512*1024;

const appDir=Deno.cwd();
const accountsPath = resolve(appDir,"accounts.json");
const ratesPath=resolve(appDir,"modelrates.json");

const forgePath=resolve(appDir,"forge");
const rohaPath=resolve(forgePath,"forge.json");

const modelAccounts = JSON.parse(await Deno.readTextFile(accountsPath));
const modelRates = JSON.parse(await Deno.readTextFile(ratesPath));

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

// rohaHistory is array of {role,name||title,content}
// attached as payload messages in chat completions

let rohaHistory=[];
let rohaModel="mut";

const flagNames={
	reasonoutloud : "echo chain of thought",
	tools : "enable model tool interface",
	commitonstart : "commit shared files on start",
	saveonexit : " save conversation history on exit",	
	ansi : "markdown ANSI rendering",
	verbose : "emit debug information",
	broken : "ansi background blocks",
	logging : "log all output to file",
	debugging : "temporary switch for emitting debug information",
	pushonshare : "emit a /push after any /share",
	rawprompt : "experimental rawmode stdin deno prompt replacement",
	resetcounters : "factory reset when reset",
	returntopush : "hit return to /push - under test",
	slow : "experimental output at reading speed",
	squash : "experimental history parse"
};

const emptyRoha={
	config:{
		showWelcome:false,
		reasonoutloud:false,
		tools:true,
		commitonstart:true,
		saveonexit:false,
		ansi:true,
		verbose:false,
		broken:false,
		logging:false,
		debugging:false,
		pushonshare:false,
		rawprompt:false,
		resetcounters:false,
		returntopush:false,
		slow:false,
		squash:false
	},
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

async function exitForge(){
	const pid=slopPid;
	if(pid){
		Deno.kill(Number(pid),"SIGTERM");
		echo("pid",pid,"killed");
		slopPid=null;
	}
//	echo(exitMessage);
	await flush();
	if(roha.config.saveonexit){
		await saveHistory();
	}
	await flush();
	Deno.stdin.setRaw(false);
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

const emptyMUT = {notes:[],errors:[],relays:0,cost:0,elapsed:0}
const emptyModel={name:"empty",account:"",hidden:false,prompts:0,completion:0}
const emptyTag={}

// const emptyShare={path,size,modified,hash,tag,id}

let roha=emptyRoha;
let listCommand="";
let creditCommand=null;
let rohaShares=[];
let currentDir = Deno.cwd();

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
	rohaHistory = [{role:"system",title:rohaTitle,content:rohaMihi}];
	const guide = rohaGuide.join(" ");
	if (guide) rohaHistory = [{role:"system",title:rohaTitle,content:guide}];
	// todo: declare model specialisations
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
		echo(indent+line);
		cursor+=line.length;
	}
}

function listHistory(){
	const wide=terminalColumns-42;
	const history=rohaHistory;
	let total=0;
	for(let i=0;i<history.length;i++){
		const item=history[i];
		const content=readable(item.content);
		const clip=content.substring(0,wide);
		const size="("+content.length+")";
		const role=item.role.padEnd(12," ");
		const name=(item.name||"forge").padEnd(15," ");
		const iii=String(i).padStart(3,"0");
		const spend=item.price?(item.emoji+" "+item.price.toFixed(4)) :"";
		echo(iii,role,name,clip,size,spend);
		total+=content.length;
	}
	const size=unitString(total,4,"B");
	echo("History size",size);
}

function logHistory(){
	const wide=terminalColumns;
	const flat=squashMessages(rohaHistory);
	for(let i=0;i<flat.length;i++){
		const item=flat[i];
		const iii=String(i).padStart(3,"0");
		const spend=item.price?(item.emoji+" "+item.price.toFixed(4)) :"";
		echo(iii,item.role,item.name||item.title||"???",spend);			
		const content=readable(item.content).substring(0,800);
		echoContent(content,wide,3,2);
	}
}

function rohaPush(content,name="forge"){
	rohaHistory.push({role:"user",name:username,content:content});
}

resetHistory();

// rohaTools

const rohaTools = [{
	type: "function",
	function:{
		name: "read_time",
		description: "Returns current time in UTC",
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
		name: "fetch_image",
		description: "Request an image to analyse",
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
		name: "annotate_forge",
		description: "Set description of any object",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string" },
				type: { type:"string" , description:"forge category", enum:["code", "tag", "share"]},
				description: { type: "string" }
			},
			required: ["name","type","description"]
		}
	}
}];

async function sleep(ms) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

function unitString(value,precision=2,type){
	if (typeof value !== 'number' || isNaN(value)) return "NaN";
	const units=["","K","M","G","T"];
	const abs=Math.abs(value);
	const unit=(Math.log10(abs)/3)|0;
	if(unit>0){
		if(unit>4)unit=4;
		let n = value / Math.pow(10, unit*3);
		const digits = Math.max(1, String(Math.floor(n)).length);
		n = n.toFixed(Math.max(0, precision - digits));
		return n+units[unit]+type;
	}
	return String(value)+type;
}
function measure(o){
	const value=(typeof o==="string")?o.length:JSON.stringify(o).length;
	return unitString(value,4,"B");
}

let outputBuffer = [];
let printBuffer = [];

function print(){
	const args=arguments.length?Array.from(arguments):[];
	const lines=args.join(" ").split("\n");
	for(const eachline of lines){
		const line=eachline.trimEnd();
		printBuffer.push({model:rohaModel,line});
	}
}

function echo(){
	const args=arguments.length?Array.from(arguments):[];
	const lines=args.join(" ").split("\n");
	for(const line of lines){
		outputBuffer.push(line.trimEnd());
	}
}

function debug(title,value){
	print(title);
	if(roha.config.verbose){
		const json=JSON.stringify(value);
		echo(json);
	}
}

async function log(lines,id){
	if(roha.config.logging){
		const time = new Date().toISOString();
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
	const delay = roha.config.slow ? slowMillis : 0;
	for (const mutline of printBuffer) {
		const mut=mutline.model;
		const line=mutline.line;
		console.log(line);		
		await log(line,mut);
		await sleep(delay)
	}
	printBuffer=[];
	for (const line of outputBuffer) {
		console.info(line);
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
	let response = await fetch(url);
	if(response.ok){
		console.log(await response.text());
	}else{
		console.error(response);
	}
	return null;
}

//https://ai.google.dev/gemini-api/docs/text-generation

function prepareContentRequest(payload){
	const contents=[];
	const sysparts=[];	// GenerateContentRequest systemInstruction content
	for(const message of payload.messages){
		switch(message.role){
			case "system":
				sysparts.push({text:message.content});
				break;
			case "user":
				contents.push({role:"user",parts:[{text:message.content}]});
				break;
			case "assistant":{
					const ass={role:"model",parts:[{text:message.content}]}
					contents.push(ass);
				}
				break;
		}
	}
	// todo tools and toolsconfig support
	const request={contents,systemInstruction:{content:{role:"system",parts:sysparts}}};
	if(roha.config.verbose){
		debug("contentRequest",request);
	}
	return request;
}

async function connectGoogle(account,config){
	try{
		const baseURL = config.url;
		const apiKey = Deno.env.get(config.env);
		if(!apiKey) return null;
		const response=await fetch(baseURL+"/models?key="+apiKey);
		if (!response.ok) {
			console.info("connectGoogle response",response)
			return null;
		}
		const models = await response.json();
		const list=[];
		for(const model of models.models){
			list.push(model.name+"@"+account);
		}
		modelList.push(...list);
		const genAI = new GoogleGenerativeAI(apiKey);
		return {
			genAI,
			apiKey,
			baseURL,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
//						config: { systemInstruction: setup, maxOutputTokens: 500,temperature: 0.1, }
						const model = genAI.getGenerativeModel({model:payload.model});
						const request = prepareContentRequest(payload);
						// todo hook up ,signal SingleRequestOptions parameter
						const result = await model.generateContent(request);
						if(roha.config.verbose){
							console.info("GoogleGenerativeAI result",result);
						}
						const text=await result.response.text();
						const usage=result.response.usageMetadata||{};

						return {
							model:payload.model,
							choices:[{message:{content:text}}],
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

async function connectDeepSeek(account,config) {
	try{
		const baseURL = config.url;
		const apiKey = Deno.env.get(config.env);
		if(!apiKey) return null;
		const headers={Authorization:"Bearer "+apiKey,"Content-Type":"application/json"};
		const response=await fetch(baseURL+"/models",{method:"GET",headers});
		if (!response.ok) return null;
		const models = await response.json();
		const list=[];
		for (const model of models.data) {
			let name=model.id+"@"+account;
			list.push(name);
// dont do this	if(verbose) echo("model - ",JSON.stringify(model,null,"\t"));
			await specModel(model,account);
		}
		list.sort();
		modelList=modelList.concat(list);
	//	echo("connected DeepSeek",list);
		return {
			apiKey,
			baseURL,
			models: {
				list: async () => models, // Return cached models or fetch fresh
			},
			chat: {
				completions: {
					create: async (payload) => {
						const url = `${baseURL}/chat/completions`;
						const response = await fetch(url, {
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
		const apiKey = Deno.env.get(config.env);
		const endpoint = new OpenAI({ apiKey, baseURL: config.url });
		if(roha.config.debugging){
			for(const [key, value] of Object.entries(endpoint)){
				let content=String(value);
				content=content.replace(/\n/g, " ");
				content=content.substring(0,30);
				if(key!="apiKey") echo("endpoint:"+key+":"+content);
			}
		}
//		const models2=await listModels(config);
		const models = await endpoint.models.list();
		const list=[];
		for (const model of models.data) {
			let name=model.id+"@"+account;
			list.push(name);
// dont do this	if(verbose) echo("model - ",JSON.stringify(model,null,"\t"));
			await specModel(model,account);
		}
		list.sort();
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
	echo("Connecting to account:", account);
	const config = modelAccounts[account];
	if (!config) return null;
	const api= config.api;
	switch(api){
		case "OpenAI":
			return await connectOpenAI(account,config)
		case "DeepSeek":
			return await connectDeepSeek(account,config)
		case "Google":
			return await connectGoogle(account,config)
	}
	return null;
}

async function specAccount(account){
	const config = modelAccounts[account];
	const endpoint = rohaEndpoint[account];
	if(!(account in roha.lode)){
		roha.lode[account] = {name: account,url: endpoint.baseURL,env: config.env,credit: 0};
	}
}

async function specModel(model,account){
	let name=model.id+"@"+account;
	let exists=name in roha.mut;
	let info=exists?roha.mut[name]:{name,notes:[],errors:[],relays:0,cost:0};
	info.id=model.id;
	info.object=model.object;
	info.created=model.created;
	info.owner=model.owned_by;
//	echo("statModel",name,JSON.stringify(model));
	if (!info.notes) info.notes = [];
	if (!info.errors) info.errors = [];
	roha.mut[name]=info;
}

async function aboutModel(name){
	const info=(name in modelRates)?modelRates[name]:null;
	let rate=info?info.pricing||[]:[];
	let rates=[];
	for(let i=0;i<rate.length;i++) rates.push(rate[i].toFixed(2));
	echo("model:",name,"tool",grokFunctions,"rates",rates.join(","));
	if(info){
		if(info.purpose)echo("purpose:",info.purpose);
		if(info.press)echo("press:",info.press);
		if(info.reality)echo("reality:",info.reality);
	}
	await writeForge();
}

async function resetModel(modelname){
	grokModel=modelname;
	const modelAccount=grokModel.split("@");
	let path=modelAccount[0];
	let account=modelAccount[1];
	grokEmoji=modelAccounts[account].emoji;
	let names=path.split("/");
	let name=names.pop();
	let nameversion=name.split("-preview");
	let mut=nameversion[0];
	rohaModel=mut;	
	grokFunctions=false;
	rohaHistory.push({role:"system",title:userdomain,content:"ModelUnderTest:"+modelname+grokEmoji});
	await aboutModel(name);
}

function dropShares(){
	let dirty=false;
	for(const item of rohaHistory){
		if(item.role==="user" && item.name==="forge"){
			item.user="forge";
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
	let sorted = roha.sharedFiles.slice();
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

function listSaves(){
	let saves=roha.saves||[];
	for(let i=0;i<saves.length;i++){
		echo(i,saves[i]);
	}
}

async function saveHistory(name) {
	try {
		let timestamp=Math.floor(Date.now()/1000).toString(16);
		let filename=(name||"transmission-"+timestamp)+".json";
		let filePath = resolve(forgePath,filename);
		let line="Saved session "+filename+".";
		rohaHistory.push({role:"system",title:"Fountain History Saved",content:line});
		await Deno.writeTextFile(filePath,JSON.stringify(rohaHistory,null,"\t"));
		echo(line);
		roha.saves.push(filename);
		await writeForge();
	} catch (error) {
		console.error("Histroy save error",error.message);
	}
}

async function loadHistory(filename){
	let history;
	try {
		const fileContent = await Deno.readTextFile(filename);
		history = JSON.parse(fileContent);
		echo("History restored from",filename);
	} catch (error) {
		console.error("Error restoring history:", error.message);
		echo("History restore error",error.message);
		resetHistory()
	}
	return history;
}


function stripAnsi(text) {
	return text.replace(/\x1B\[\d+(;\d+)*[mK]/g, "");
}

// Array of 8 ANSI colors (codes 30-37) selected for contrast and visibility in both light and dark modes.
const ansiColors = [
	"\x1b[30m", // Black: Deep black (#333333), subtle on light, visible on dark
	"\x1b[31m", // Red: Muted red (#CC3333), clear on white and black
	"\x1b[32m", // Green: Forest green (#2D6A4F), good contrast on both
	"\x1b[33m", // Yellow: Golden yellow (#DAA520), readable on dark and light
	"\x1b[34m", // Blue: Medium blue (#3366CC), balanced visibility
	"\x1b[35m", // Magenta: Soft magenta (#AA3377), distinct on any background
	"\x1b[36m", // Cyan: Teal cyan (#008080), contrasts well without glare
	"\x1b[37m"  // White: Light gray (#CCCCCC), subtle on light, clear on dark
];

function ansiStyle(text, style = "bold", colorIndex = null) {
	if (!roha.config.ansi) return text;
	let formatted = text;
	switch (style.toLowerCase()) {
		case "bold": formatted = "\x1b[1m" + formatted + "\x1b[0m"; break;
		case "italic": formatted = "\x1b[3m" + formatted + "\x1b[0m"; break;
		case "underline": formatted = "\x1b[4m" + formatted + "\x1b[0m"; break;
	}
	if (!Deno.noColor && colorIndex !== null && colorIndex >= 0 && colorIndex < ansiColors.length) {
		formatted = ansiColors[colorIndex] + formatted + "\x1b[0m";
	}
	return formatted;
}

const ansiWhite = "\x1b[38;5;255m";
const ansiNeonPink = "\x1b[38;5;201m";
const ansiVividOrange = "\x1b[38;5;208m";

const ansiGreenBG = "\x1b[48;5;23m";
const ansiTealBG = "\x1b[48;5;24m";
const ansiGreyBG = "\x1b[48;5;232m";
const ansiReset = "\x1b[0m";

const ansiCodeTitle = ansiTealBG+ansiVividOrange;
const ansiCodeBlock = ansiGreenBG+ansiWhite;
const ansiReplyBlock = ansiGreyBG;
const ansiDashBlock = ansiGreyBG;

const ansiPop = "\x1b[1;36m";

const ansiMoveToEnd = "\x1b[999B";
const saveCursor=new Uint8Array([27,91,115]);
const restoreCursor=new Uint8Array([27,91,117]);

const homeCursor = new Uint8Array([27, 91, 72]);
const disableScroll = new Uint8Array([27, 91, 55, 59, 49, 59, 114]);
const restoreScroll = new Uint8Array([27, 91, 114]);

const rohaPrompt=">";
let colorCycle=0;

function mdToAnsi(md) {
	const broken = roha.config.broken;
	const lines = md.split("\n");
	let inCode = false;
	const result = broken?[ansiReplyBlock]:[];
	for (let line of lines) {
		line=line.trimEnd();
		const trim=line.trim();
		if (trim.startsWith("```")) {
			inCode = !inCode;
			if(inCode){
				const codeType=trim.substring(3).trim();
//				result.push(ansiCodeTitle)
//				result.push("====                   [   ]");
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
				// headershow
				const header = line.match(/^#+/);
				if (header) {
					const level = header[0].length;
					line = line.substring(level).trim();
					const ink=Deno.noColor?"":ansiColors[(colorCycle++)&7];
					line = ink + line + ansiReset;	//ansiPop
				}
				// bullets
				if (line.startsWith("*") || line.startsWith("+")) {
					line = "• " + line.substring(1).trim();
				}
				// bold
				if (line.includes("**")) {
					line = line.replace(/\*\*(.*?)\*\*/g, "\x1b[1m$1\x1b[0m");
				}
				// italic
				line = line.replace(/\*(.*?)\*/g, "\x1b[3m$1\x1b[0m");
				line = line.replace(/_(.*?)_/g, "\x1b[3m$1\x1b[0m");
				// wordwrap
				line=wordWrap(line,terminalColumns);
			}
			result.push(line.trimEnd());
		}
	}
	result.push(ansiReset);
	return result.join("\n");
}

async function hashFile(filePath) {
	const buffer = await Deno.readFile(filePath);
	const hash = await crypto.subtle.digest("SHA-256", buffer);
	const bytes = new Uint8Array(hash);
	return Array.from(bytes, (byte) =>
		byte.toString(16).padStart(2, "0")
	).join("");
}

async function readForge(){
	try {
		const fileContent = await Deno.readTextFile(rohaPath);
		roha = JSON.parse(fileContent);
		if(!roha.saves) roha.saves=[];
		if(!roha.counters) roha.counters={};
		if(!roha.mut) roha.mut={};
		if(!roha.forge) roha.forge=[];
		if(!roha.lode) roha.lode={};
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
	rohaShares = [];
	roha.sharedFiles=[];
//	roha.tags={};
	if(roha.config.resetcounters) roha.counters={};
	increment("resets");
	await writeForge();
	resetHistory();
	echo("resetRoha","All shares and history reset.");
}

function resolvePath(dir,filename){
	let path=resolve(dir,filename);
	path = path.replace(/\\/g, "/");
	return path;
}

// a raw mode prompt replacement
// roha.config.rawprompt is not default
// arrow navigation and tab completion incoming
// a reminder to enable rawprompt for new modes

const reader = Deno.stdin.readable.getReader();
const writer = Deno.stdout.writable.getWriter();

let promptBuffer = new Uint8Array(0);

async function promptForge(message) {
	if(!roha.config.rawprompt) return prompt(message);
	let result = "";
	if (message) {
		await writer.write(encoder.encode(message));
		await writer.ready;
	}
	if(roha.config.page) {
		await writer.write(homeCursor);
	}
	Deno.stdin.setRaw(true);
	try {
		let busy = true;
		while (busy) {
			const { value, done } = await reader.read();
			if (done || !value) break;
			let bytes = [];
			for (const byte of value) {
				if (byte === 0x7F || byte === 0x08) { // Backspace
					if (promptBuffer.length > 0) {
						promptBuffer = promptBuffer.slice(0, -1);
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
					let line = decoder.decode(promptBuffer);
					let n = line.length;
					if (n > 0) {
						promptBuffer = promptBuffer.slice(n);
					}
					result = line.trimEnd();
					await log(result, "stdin");
					busy = false;
				} else {
					bytes.push(byte);
					const buf = new Uint8Array(promptBuffer.length + 1);
					buf.set(promptBuffer);
					buf[promptBuffer.length] = byte;
					promptBuffer = buf;
				}
			}
			if (bytes.length) await writer.write(new Uint8Array(bytes));
		}
	} finally {
		Deno.stdin.setRaw(false);
	}
	if(roha.config.page) await writer.write(homeCursor);
	return result;
}

async function fileLength(path) {
	const info = await Deno.stat(path);
	return info.size;
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
		const paths = [];
		for await (const file of Deno.readDir(dir)) {
			if (file.isFile && !file.name.startsWith(".")) {
				paths.push(resolvePath(dir, file.name));
			}
		}
		for (const path of paths) {
			try {
				echo("Sharing",path);
				const info = await Deno.stat(path);
				const size = info.size||0;
				const modified = info.mtime.getTime();
				const hash = await hashFile(path);
				await addShare({ path, size, modified, hash, tag });
			} catch (error) {
				echo("shareDir path",path,"error",error.message);
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

const textExtensions = [
	"js", "ts", "txt", "json", "md",
	"css","html", "svg",
	"cpp", "c", "h", "cs",
	"sh", "bat",
	"log","py","csv","xml","ini"
];

async function shareBlob(path,size,tag){
	const extension = path.split(".").pop().toLowerCase();
	const mimeType = fileType(extension);	
	const metadata = JSON.stringify({ path:path,length:size,type:mimeType,tag });
	rohaPush(metadata);
	if (textExtensions.includes(extension)) {
		const content = await Deno.readTextFile(path);
		rohaPush(content,"forge");
	} else {
		const data = await Deno.readFile(path);
		const base64 = encodeBase64(data);
		rohaPush(`File content: MIME=${mimeType}, Base64=${base64}`, "forge");
	}
	return true;
}

async function commitShares(tag) {
	let count = 0;
	let dirty = false;
	const validShares = [];
	const removedPaths = [];
	for (const share of roha.sharedFiles) {
		if (tag && share.tag !== tag) {
			validShares.push(share);
			continue;
		}
		try {
			const path=share.path;
			const info = await Deno.stat(path);
			const size=info.size;
			if (!info.isFile || size > MaxFileSize) {
				removedPaths.push(path);
				echo("Removed invalid path",path);
				dirty = true;
				continue;
			}
			const modified = share.modified !== info.mtime.getTime();
			const isShared = rohaShares.includes(path);
			if (modified || !isShared) {
				let ok=await shareBlob(path,size,tag);
				if(ok){
					count++;
					share.modified = info.mtime.getTime();
					dirty = true;
					if (!rohaShares.includes(path)) {
						rohaShares.push(path);
						echo("Shared path",path);
					}else{
						echo("Updated share path",path);
					}
				}
			}
			validShares.push(share);
		} catch (error) {
			if (error instanceof Deno.errors.NotFound || error instanceof Deno.errors.PermissionDenied) {
				removedPaths.push(share.path);
				dirty = true;
			}
			echo("commitShares path", share.path,"error", error.message);
		}
	}
	if (removedPaths.length) {
		roha.sharedFiles = validShares;
		await writeForge();
		echo("Removed invalid shares:", removedPaths.join(" "));
	}
	if (dirty && tag) {
		rohaHistory.push({ role: "system", title:"Fountain Tool Hint", content: "Feel free to call annotate_forge to tag " + tag });
	}
	if (count && roha.config.verbose) {
		echo("Updated files",count,"of",validShares.length);
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
	const cmd = Deno.build.os === "windows" ? ["start", "", path] : Deno.build.os === "darwin" ? ["open", path] : ["xdg-open", path];
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
		await specAccount(name);
		let lode=roha.lode[name];
		echo("Adjust",lode.name,"balance",price(lode.credit));
		creditCommand=(credit) => creditAccount(credit, name);
	}else{
		let list=[];
		for(let key in modelAccounts){
			list.push(key);
		}
		for(let i=0;i<list.length;i++){
			let key=list[i];
			if(key in roha.lode){
				let lode=roha.lode[key];
				echo(i,key,price(lode.credit));
			}else{
				echo(i,key);
			}
			lodeList=list;
			listCommand="credit";
		}
	}
}

async function showHelp() {
	try {
		const md = await Deno.readTextFile("forge.md");
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
	let sorted = shares.slice();
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
		const filename = words.slice(1).join(" ");
		const path = resolvePath(Deno.cwd(), filename);
		const info = await Deno.stat(path);
		const tag = "";//await promptForge("Enter tag name (optional):");
		if(info.isFile){
			const size=info.size;
			const modified=info.mtime.getTime();
			echo("Attach media path:",path,"size:",info.size);
//			const hash = await hashFile(path,size);
//			echo("hash:",hash);
//			await addShare({path,size,modified,hash,tag});
		}
		await writeForge();
	}
}

//
// let listening=false;
// TODO - use deno comms to talk with slop <=> fountain task comms

async function serveConnection(connection){
	console.log("serveConnection ",JSON.stringify(connection));
	await connection.write(encoder.encode("greetings from fountain client"));
}

async function listenService(){
	echo("listening from fountain for slop on port 8081");
	const listener = Deno.listen({ hostname: "localhost", port: 8081, transport: "tcp" });
	while (true) {
        const connection = await listener.accept();
		await serveConnection(connection);
	}
}

async function callCommand(command) {
	let dirty=false;
	let words = command.split(" ");
	try {
		switch (words[0]) {
			case "listen":
				listenService();
				break;
			case "attach":
				await attachMedia(words);
				break;
			case "think":
				if (words.length > 1) {
					const newThink = parseFloat(words[1]);
					if (!isNaN(newThink) && newThink >= 0 && newThink <= 8192) {
						grokThink = newThink;
					}
				}
				echo("Current model thinking budget is", grokThink);
				break;
			case "temp":
				if (words.length > 1) {
					const newTemp = parseFloat(words[1]);
					if (!isNaN(newTemp) && newTemp >= -5 && newTemp <= 50) {
						grokTemperature = newTemp;
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
			case "credit":
				await onAccount(words);
				break;
			case "help":
				await showHelp();
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
							// call history command?
						}
					}else{
						listSaves();
					}
				}
				break;
			case "save":{
					const savename=words.slice(1).join(" ");
					await saveHistory(savename);
				}
				break;
			case "note":
				if(grokModel in roha.mut){
					const mut=roha.mut[grokModel];
					const note=words.slice(1).join(" ");
					if(note.length){
						mut.notes.push(note);
						await writeForge();
					}else{
						const n=mut.notes.length;
						for(let i=0;i<n;i++){
							echo(i,mut.notes[i]);
						}
					}
				}
				break;
			case "dump":
				for(let i=0;i<modelList.length;i++){
					let name=modelList[i];
					if(name in modelRates){
						echo(name);
						aboutModel(name);
						echo(".");
					}
				}
				break;
			case "model":{
					let name=words[1];
					if(name && name!="all"){
						if(name.length&&!isNaN(name)) name=modelList[name|0];
						if(modelList.includes(name)){
							resetModel(name);
						}
					}else{
						let all=name && name=="all";
						for(let i=0;i<modelList.length;i++){
							let name=modelList[i];
							let attr=(name==grokModel)?"*":" ";
							let mut=(name in roha.mut)?roha.mut[name]:emptyMUT;
							mut.name=name;
							let flag = (mut.hasForge) ? "𝆑" : "";
							let notes=mut.notes.join(" ");
							let rated=name in modelRates?modelRates[name]:null;
							if(rated || all){
								let pricing=(rated&&rated.pricing)?JSON.stringify(rated.pricing):"";
								echo(i,attr,name,flag,mut.relays|0,notes,pricing);
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
					const newDir = words[1];
					if (newDir.length) Deno.chdir(newDir);
				}
				currentDir = Deno.cwd();
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
			case "share":
				if (words.length==1){
					listShare();
				}else{
					const filename = words.slice(1).join(" ");
					const path = resolvePath(Deno.cwd(), filename);
					const info = await Deno.stat(path);
					const tag = "";//await promptForge("Enter tag name (optional):");
					if(info.isDirectory){
						echo("Share directory path:",path);
						await shareDir(path,tag);
					}else{
						const size=info.size;
						const modified=info.mtime.getTime();
						echo("Share file path:",path," size:",info.size," ");
						const hash = await hashFile(path,size);
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
		echo("callCommand",command,error.message);
	}
	increment("calls");
	return dirty;
}

async function pathExists(path) {
	try {
		const stat = await Deno.stat(path);
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
		case "read_time":
			return {time: new Date().toISOString()};
		case "submit_file":
			let args=JSON.parse(toolCall.function.arguments);
			echo(args.contentType);
			if (verbose) echo(args.content);
			let timestamp=Math.floor(Date.now()/1000).toString(16);
			let extension=extensionForType(args.contentType)
			let name= "submission-"+timestamp+extension;
			let filePath = resolve(forgePath,name);
			await Deno.writeTextFile(filePath, args.content);
			echo("File saved to:", filePath);
			roha.forge.push({name,path:filePath,type:args.contentType});
			return { success: true, path: filePath };
		case "fetch_image":
			const { fileName } = JSON.parse(toolCall.function.arguments || "{}");
			echo("Fetching image:", fileName);
			let path="media/"+fileName;
			const data = await Deno.readFile(path);
			const base64 = encodeBase64(data);			
			return { success: true, path: fileName, Base64:base64 };
		case "annotate_forge":
			try {
				const { name, type, description } = JSON.parse(toolCall.function.arguments || "{}");
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
			break;
		default:
			echo("onCall unhandled function name:",name);
			debug("toolCall",toolCall);
			return { success: false, updated: 0 };
		}
}

function squashMessages(history) {
	if (history.length < 2) return history;
	const squashed = [];
	const system=[];
	const others=[];
	for(const item of history){
		if(item.role=="system") system.push(item); else others.push(item);
	}
	for(const list of [[...system],[...others]]){
		let last=null;
		for (let i = 0; i < list.length; i++) {
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
	const results = [];
	for (const tool of calls) {
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
			const result = await onCall(tool);
			results.push({
				tool_call_id: tool.id,
				name: tool.function.name,
				content: JSON.stringify(result || {success: false})
			});
		} catch (e) {
			results.push({
				tool_call_id: tool.id,
				name: tool.function.name,
				content: JSON.stringify({error: e.message})
			});
			await log("processToolCalls failure");
			//`Tool call failed: ${tool.function.name} - ${e.message}`, "error");
		}
	}
	return results;
}

async function relay(depth) {
	const verbose=roha.config.verbose;
	let payload={};
	let spend=0;
	try {
		const now=performance.now();
		const modelAccount=grokModel.split("@");
		const model=modelAccount[0];
		const account=modelAccount[1];
		const endpoint=rohaEndpoint[account];

		// prepare payload

		payload={model};
		const useTools=grokFunctions&&roha.config.tools;
		// some toolless models may get snurty unless messages are squashed
		if(useTools){
			payload.messages=[...rohaHistory];
			payload.tools=rohaTools;
		}else{
//			payload.messages=squashMessages(rohaHistory);
			payload.messages=[...rohaHistory];
		}
		// check stone flag before enabling temperature
		const info=(grokModel in modelRates)?modelRates[grokModel]:null;
		if(info && !info.stone){
			//echo("not stone",grokTemperature);
			payload.temperature = grokTemperature;
		}
		if(info && info.max_tokens){
			payload.max_tokens=info.max_tokens;
		}
		if(info && info.pricing.length>3 && grokThink>0){
			payload.config={thinkingConfig:{thinkingBudget:grokThink}};
		}
		if(roha.config.debugging){
//			debug("payload",JSON.stringify(payload));
			echo(JSON.stringify(payload,null,"\t"));
		}		

		// relay completions

//		if(config.hasCache) payload.cache_tokens=true;
		const completion = await endpoint.chat.completions.create(payload);
		const elapsed=(performance.now()-now)/1000;
		if (completion.model != model) {
			echo("[relay model alert model:" + completion.model + " grokModel:" + grokModel + "]");
//			grokModel=completion.model+"@"+account;
			const name=completion.model+"@"+account;
			resetModel(name);
		}
		if (verbose) {
			// echo("relay completion:" + JSON.stringify(completion, null, "\t"));
		}
		let system = completion.system_fingerprint;
		let usage = completion.usage;
		let size = measure(rohaHistory);
		let spent=[usage.prompt_tokens | 0,usage.completion_tokens | 0];
		grokUsage += spent[0]+spent[1];
		if(grokModel in roha.mut){
			let mut=roha.mut[grokModel];
			mut.relays = (mut.relays || 0) + 1;
			mut.elapsed = (mut.elapsed || 0) + elapsed;
			if(grokModel in modelRates){
				let rate=modelRates[grokModel].pricing||[0,0];
				const tokenRate=rate[0];
				const outputRate=rate[rate.length>2?2:1];
				if(rate.length>2){
					const cacheRate=rate[1];
					const cached=usage.prompt_tokens_details?(usage.prompt_tokens_details.cached_tokens||0):0;
					spend=spent[0]*tokenRate/1e6+spent[1]*outputRate/1e6+cached*cacheRate/1e6;

				}else{
					spend=spent[0]*tokenRate/1e6+spent[1]*outputRate/1e6;
				}
				mut.cost+=spend;
				let lode = roha.lode[account];
				if(lode && typeof lode.credit === "number") {
					lode.credit-=spend;
					if (verbose) {
						let summary="{account:"+account+",spent:"+spend.toFixed(4)+",balance:"+(lode.credit).toFixed(4)+"}";
						echo(summary);
					}
				}
				await writeForge();
			}else{
				if(verbose){
					echo("modelRates not found for",grokModel);
				}
			}
			mut.prompt_tokens=(mut.prompt_tokens|0)+spent[0];
			mut.completion_tokens=(mut.completion_tokens|0)+spent[1];
			if(useTools && mut.hasForge!==true){
				mut.hasForge=true;
				await writeForge();
			}
		}

		const details=(usage.prompt_tokens_details)?JSON.stringify(usage.prompt_tokens_details):"";

//		if(usage.prompt_tokens_details) echo(JSON.stringify(usage.prompt_tokens_details));
//		if(usage.prompt_tokens_details) echo(JSON.stringify(usage));

		let cost="("+usage.prompt_tokens+"+"+usage.completion_tokens+"["+grokUsage+"])";
		if(spend) {
			cost="$"+spend.toFixed(3);
		}
		let temp=grokTemperature.toFixed(1)+"°";
		let modelSpec=[rohaTitle,grokModel,temp,cost,size,elapsed.toFixed(2)+"s"];
		let status = "["+modelSpec.join(" ")+"]";

		if (roha.config.ansi)
			echo(ansiDashBlock+status+ansiReset);
		else
			echo(status);
		var replies = [];
		for (const choice of completion.choices) {
			let calls = choice.message.tool_calls;
			// choice has index message{role,content,refusal,annotations} finish_reason
			if (calls) {
				increment("calls");
				debug("relay calls in progress",calls)
				const toolCalls = calls.map((tool, index) => ({
					id: tool.id,
					type: "function",
					function: {name: tool.function.name,arguments: tool.function.arguments || "{}"}
				}));
				let content=choice.message.content || "";
				rohaHistory.push({role:"assistant",name:payload.model,content,tool_calls: toolCalls});
				const toolResults = await processToolCalls(calls);
				for (const result of toolResults) {
				  rohaHistory.push({role:"tool",tool_call_id:result.tool_call_id,name:result.name,content:result.content});
				}
				await relay(depth+1); // Recursive call to process tool results
			}
			const reasoning = choice.message.reasoning_content;
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
			const reply = choice.message.content;
			if(reply){
				if (roha.config.ansi) {
					print(mdToAnsi(reply));
				} else {
					print(wordWrap(reply));
				}
				replies.push(reply);
			}
		}
		const name=rohaModel||"mut1";
		let content=replies.join("\n\n");
		const ass={role:"assistant",name,content};
		if(spend) {
			ass.price=spend;
			ass.emoji=grokEmoji;
		}
		rohaHistory.push(ass);

	} catch (error) {
		let line=error.message || String(error);
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
		//unhandled error line: 400 Unrecognized request argument supplied: cache_tokens
		if(grokFunctions){
			if(line.includes("does not support Function Calling")){
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
		echo("unhandled error line:", line);
		if(verbose){
			echo(String(error));
		}
//		if(roha.config.debugging){
//			echo(JSON.stringify(payload));
//		}
	}
}

async function chat() {
	dance:
	while (true) {
		let lines=[];
		let images=[];
//		echo(ansiMoveToEnd);
		while (true) {
			await flush();
			let line="";
			if(listCommand){
				line=await promptForge("#");
				if(!line.startsWith("/")){
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
				if(!line.startsWith("/")){
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

			if (line.startsWith("/")) {
				const command = line.substring(1).trim();
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
				rohaHistory.push({ role: "user", name:rohaUser, content: query });
				await relay(0);
			}
		}
	}
}

// forge uses rohaPath to boot

let forgeExists = await pathExists(forgePath);
if(!forgeExists){
	await Deno.mkdir(forgePath);
	echo("Created path",forgePath);
	forgeExists=true;
}
const fileExists = await pathExists(rohaPath);
if (!fileExists) {
	await Deno.writeTextFile(rohaPath, JSON.stringify(emptyRoha));
	echo("Created forge",rohaPath);
}

// forge lists models from active accounts

echo(rohaTitle,"running from "+rohaPath);

await flush();
await readForge();
const rohaEndpoint={};
for(let account in modelAccounts){
	const t=performance.now();
	let endpoint = await connectAccount(account);
	if(endpoint) {
		rohaEndpoint[account]=endpoint;
		await specAccount(account);
		let elapsed=performance.now()-t;
		elapsed.toFixed(2)+"s"
	}else{
		echo("endpoint failure for account",account);
	}
}

// forge starts here, grok started this thing, blame grok

await flush();

let grokModel = "";
let grokEmoji = "";
let grokFunctions=true;
let grokUsage = 0;
let grokTemperature = 1.0;
let grokThink = 0.0;

resetModel(roha.model||"deepseek-chat@deepseek");

echo("user:",rohaUser,"shares:",roha.sharedFiles.length)
echo("use /help for latest and exit to quit");
echo("");

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
		echo("commitonstart");
		await flush();
		await commitShares();
	}
}else{
	roha.config={};
}

listenService();

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
