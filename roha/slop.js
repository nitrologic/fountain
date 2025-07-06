// slop.js
// (c)2025 nitrologic 
// All rights reserved

"use strict"

var logDiv;
var logText;    // "div"
var logVars;
var logVals;

function addTitle(group,name,labelClassName="dsplabel"){
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
	addTitle(logDiv,"Slop Log");
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

function onLoad(){
	initLog();
}

function onFocus(){
//	console.log("FOCUS")
}

window.onfocus=onFocus;
window.onload=onLoad;
//window.onhashchange=onHash;

