// slopstudio.js
// (c)2025 nitrologic 
// All rights reserved

// todo: check onRemoteEvent

"use strict"

const AppVersion="Slop Studio 0.2"
const AppBanner=AppVersion+" ©2025 nitrologic All Rights Reserved";
const AppAbout="a boot";

let PollSession=false;

function replaceString(a,b,c){
	const split=a.split(b);
	const join=split.join(c);	
	return join;
}

function shorten(number){
	if(number>=1e12) return (number/1e12).toFixed(3)+"T";
	if(number>=1e9) return (number/1e9).toFixed(3)+"G";
	if(number>=1e6) return (number/1e6).toFixed(3)+"M";
	if(number>=1e3) return (number/1e3).toFixed(3)+"K";
	return number.toFixed(3);
}

let localEventCount=0;
let localEventQueue=[]

let localEventHandlers={}
let LocalEventRecording=[];

let remoteEventHandlers={}

function queueMessage(e){
	localEventQueue.push(e);
	onLocalEvent(e);
	pingSession();
}

function onLocalEvent(e){
	LocalEventRecording.push(e);
	localEventCount++;
//	logVar("events",localEventCount)
	const src=e.src;
	if(src in localEventHandlers){
		const handlers=localEventHandlers[src];
		for(const handler of handlers){
			handler(e);
		}
	}
}
function flushLocalEvents(){
	const events=localEventQueue;
	localEventQueue=[];
	return events;
}

function onRemoteEvent(src,handler){
	if(!(src in remoteEventHandlers)){
		remoteEventHandlers[src]=[];
	}
	remoteEventHandlers[src].push(handler);
}

let rpcCount=0;

function onRPCLoad(e){
	const target=e.currentTarget;
	let response;
	if(target.status!=200){
		log("RPC "+target.rpc+" Error status:"+target.status+" "+target.statusText);
	}else{
		try{
			response=JSON.parse(target.response);
			if(response.error){
				log("RPC "+target.rpc+" Error response:"+JSON.stringify(response.error));
			}else{
				target.handler(response.result,target.userdata);
			}			
		}catch(exception){
			log("onRPCLoad parse exception "+exception.toString()+" from "+target.rpc);
			log(target.response);
		}
	}
}	

function sendRPC(uri,method,params,handler,data){
	const id=++rpcCount;
	const json={jsonrpc:"2.0",id:id,method:method,params:params};
	const body=JSON.stringify(json);
	const param=JSON.stringify(params);
	const rpc=method+" ("+param+")";
	// todo: optional rpc client logging
//	console.log("sendRPC "+rpc+" ["+body.length+"]");
	const request=new XMLHttpRequest();
	request.addEventListener("load", onRPCLoad);
	request.handler=handler;
	request.rpc=rpc;
	request.userdata=data;
	// todo: explicit third parameter 
	request.open("POST", uri);
	request.setRequestHeader("Content-Type","application/json");
	request.setRequestHeader("Accept","application/json");
	try {
		request.send(body);
	} catch (exception) {
		console.log("EXCEPTION: dspstudio sendRPC() " + exception);
	}	
}

let sysSession="";
let sysTick;
let sysInfos;
let sysDiv;

function addInfo(name,value){
	let info;
	if(sysDiv){
		info=addInput("text",sysDiv,name,"span","box");
		info.setAttribute("readonly","");
		info.value=value;
	}
	if(name=="name"){
		document.title=value;
	}
	sysInfos[name]=info;
	return info;
}

function onSysInfo(sysInfo){
	const latency=performance.now()-pollBegin;
	logVar("ping",latency.toFixed(2));
	if(sysInfos){
		console.log("[onSysInfo] Connection appending sysInfos");
		for(const name of Object.keys(sysInfo)){
			const value=sysInfo[name];
			sysInfos[name].value=value;
		}
	}else{
		sysInfos=[];
		var user="guest";
		var host="localhost";
		var platform="platform";
		var connection=0;
		for(const name of Object.keys(sysInfo)){
			var value=sysInfo[name];
			addInfo(name,value);
			if(name=="hostName") host=value;
			if(name=="userName") user=value;
			if(name=="platform") platform=value;
			if(name=="session") {
				sysSession=value;
				sysTick=0;
			}
		}
		log("Connection courtesy "+user + " at "+host+" on "+platform+" Session "+sysSession);
		pumpSession();
	}
}


let pollBegin;
let userInfo;

function specScreen(){
	const s=window.screen;
	const ratio=window.devicePixelRatio||1;
	const gyro=(typeof Gyroscope === "function");
	const orient=(typeof OrientationSensor === "function");
	const grav=(typeof GravitySensor=="function");
	return {
		width:s.width,
		height:s.height,
		depth:s.pixelDepth,
		ratio,
		angle:s.orientation.angle,
		rotation:s.orientation.type,
		gyro,
		orient,
		grav
	}
}

function refreshSession(){
	const agent = navigator.userAgentData||navigator;
	const screen=specScreen();
	const speech=!!speechSynthesis;
	userInfo={
		platform:agent.platform,
		mobile:agent.mobile,
		language:navigator.language,
		touch:navigator.maxTouchPoints|0,
		screens:[screen],
		speech
	};
	console.log("userInfo:"+JSON.stringify(userInfo));
	pollBegin=performance.now();
	sendRPC("/api","sys.info",userInfo,onSysInfo);
}

let pollMillis=0;

function onTick(tick){
	const millis = performance.now();	
	const elapsed=pollMillis?(millis-pollMillis):0;
	logVal("elapsed",elapsed);
	pollMillis=millis;
//	var index=tick.index;
	for(const message of tick.messages){
		// someone was here
	}
	if(PollSession){
		pollSession();
	}
}

function pollSession(){
	const recentEvents=flushLocalEvents();
	const tick=sysTick++;
	sendRPC("/api","sys.tick",{session:sysSession,tick,events:recentEvents},onTick);
}

function pumpSession(){
	if(sysSession){
		pollSession();
		pollSession();
//		pollSession();
//		pollSession();
	}
}

function pingSession(){
	if(sysSession && !PollSession){
		pollSession();
	}
}


// [studio] log div

let logDiv;
let logText;
let logVars;
let logVals;

// [studio] logging

function log(...data){
	const line=data.join(" ").trim();
	console.log(line);
	const text=document.createTextNode(line+"\n");
	logText.appendChild(text);
	logText.appendChild(document.createElement("br"));
	logText.scrollTop=logText.scrollHeight;
}

function logVar(name,label){
	let varinfo=logVars[name];
	if(!varinfo){
		let info=addInput("text",logVarBar,name);
		info.setAttribute("readonly","");
		info.setAttribute("small","");
		varinfo={info};
		logVars[name]=varinfo;
	}
	let var0=varinfo.info;
	var0.value=label;
}

function logVal(name,value){
	if(!value)return;
	let varlimit=logVals[name];
	if(!varlimit){
		const info=addInput("text",logVarBar,name);
		info.setAttribute("readonly","");
		// limit is peak until further notice
		varlimit={info,limit:0,filter:0};
		logVals[name]=varlimit;
	}
	if(value>varlimit.limit){
		varlimit.limit=value;		
	}
	varlimit.filter=(varlimit.filter*8+value)/9;
	const var0=varlimit.info;
	const label=value.toFixed(2)+" peak "+varlimit.limit.toFixed(2)+" ~ "+varlimit.filter.toFixed(2);
	var0.value=label;
}

let logTools;
let logVarBar;

function initLog(){
	logDiv=document.getElementById("log");
	addTitle(logDiv,"Slop Studio Log");
    logTools=addToolbar(logDiv);
/*
	
	logClear=addButton(logTools,"Clear",clearLog);
	logRefresh=addButton(logTools,"Refresh",refreshLog);
	logOnline=addButton(logTools,"Online",onlineLog);
	logFactoryReset=addButton(logTools,"Factory Reset",onFactoryReset);
*/
	logText=addLog(logDiv);
	logVars={}; // plain strings
	logVals={};	// have limits
	logVarBar=addDiv("block",logTools);
}

function onKeydown(e){
	const keycode=e.code;
	if(keycode=="Insert"){
		const text=promptBox.value;
		promptBox.value="";
		if(text){
			log("[STUDIO]",text);
			queueMessage(text);
// todo: send prompt to sloppipe connection

		}
	}
}

let promptDiv;
let promptTools;
let promptBox;

function initPrompt(){
	promptDiv=document.getElementById("prompt");
	addTitle(promptDiv,"Slop Studio Prompt");
    promptTools=addToolbar(promptDiv);
	promptBox=addTerminal(promptTools,"prompt",onKeydown);
}


let pageBody;

function onLoad(){
	sysDiv=document.getElementById("system");
	pageBody=document.body;
	pageBody.setAttribute("palette","night");
	initLog();
	initPrompt();
	log(AppBanner);
	refreshSession();
}

function onFocus(){
//	console.log("FOCUS")
}

window.onfocus=onFocus;
window.onload=onLoad;
//window.onhashchange=onHash;

