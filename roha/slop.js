// slop.js
// (c)2025 nitrologic 
// All rights reserved

"use strict"

const AppVersion="Slop Studio 0.1"
const AppBanner=AppVersion+" ©2025 nitrologic All Rights Reserved";
const AppAbout="a boot";

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

function log(...data){
	const line=data.join(" ");
	console.log(line);
	const text=document.createTextNode(line+"\n");
	logText.appendChild(text);
	logText.scrollTop=logText.scrollHeight;
}

let rpcCount=0;

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

let sysInfos;

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
		var connection=0;
		for(const name of Object.keys(sysInfo)){
			var value=sysInfo[name];
			addInfo(name,value);
			if(name=="Name") host=value;
			if(name=="User") user=value;
			if(name=="Session") {
				SysSession=value;
				SysTick=0;
			}
		}
		log("Connection courtesy "+user + " at "+host+" Session "+SysSession);
//		pumpSession();
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

let logDiv;
let logText;
let logVars;
let logVals;

function addTitle(group,name,labelClassName="label"){
	const div=document.createElement("div");
	div.className="group";
	const labelText=document.createTextNode(name);
	const label=document.createElement("label");
	label.appendChild(labelText);
	label.className=labelClassName;
	div.appendChild(label);
	group.appendChild(div);
	return div;
}

function addLog(group){
	const div=document.createElement("div");
	div.className="log";
	group.appendChild(div);
	return div;
}

function initLog(){
	logDiv=document.getElementById("log");
	addTitle(logDiv,"Slop Fountain Log");
/*
    logTools=addToolbar(logDiv);
	
	logClear=addButton(logTools,"Clear",clearLog);
	logRefresh=addButton(logTools,"Refresh",refreshLog);
	logOnline=addButton(logTools,"Online",onlineLog);
	logFactoryReset=addButton(logTools,"Factory Reset",onFactoryReset);
*/
	logText=addLog(logDiv);
	logVars={}; // plain strings
	logVals={};	// have limits
//	logVarBar=addDiv("block",logTools);
}

let pageBody;

function onLoad(){
	pageBody=document.body;
	pageBody.setAttribute("palette","night");
	initLog();
	log(AppVersion);
	refreshSession();
}

function onFocus(){
//	console.log("FOCUS")
}

window.onfocus=onFocus;
window.onload=onLoad;
//window.onhashchange=onHash;

