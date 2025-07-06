// slop.js
// (c)2025 nitrologic 
// All rights reserved

"use strict"

const AppVersion="Slop Studio 0.1"
const AppBanner=AppVersion+" ©2025 nitrologic All Rights Reserved";
const AppAbout="a boot";

function replaceString(a,b,c){
	var split=a.split(b);
	var join=split.join(c);	
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
	var text=document.createTextNode(line+"\n");
	logText.appendChild(text);
	logText.scrollTop=logText.scrollHeight;
}

var logDiv;
var logText;
var logVars;
var logVals;

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

var pageBody;

function onLoad(){
	pageBody=document.body;
	pageBody.setAttribute("palette","night");
	initLog();
	log(AppVersion);
}

function onFocus(){
//	console.log("FOCUS")
}

window.onfocus=onFocus;
window.onload=onLoad;
//window.onhashchange=onHash;

