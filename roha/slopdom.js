// slopdom.js
// (c)2025 nitrologic 
// All rights reserved

"use strict"

function addDiv(type,group,name=" "){
	const div=document.createElement("div");
	div.className=type;
	if(name.trim().length>0){
		const label=document.createElement("span");
		label.className=type+"label";
		const text=document.createTextNode(name);
		label.appendChild(text);
		div.appendChild(label);
	}
	group.appendChild(div);
	return div;
}

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

function splitNameInfo(nameinfo){
	const split=nameinfo.split("<");
	const info=split[1];
	if(info && info.endsWith(">")){
		split[1]=info.substring(0,info.length-1);
	}
	return split;
}

function addInput(type,group,nameinfo,divspan="span",className="box"){
	const span=document.createElement(divspan);
	// not sure about this
	span.className=className;
	const split=splitNameInfo(nameinfo)
	const name=split[0];
	const info=split[1]||"anon input";
	span.setAttribute("title",info)
	const text=document.createTextNode(name);
	const label=document.createElement("label");
	label.className="label"; //todo - add input type
	const input=document.createElement("input");
	input.id=name;
	input.className=className;
	input.setAttribute("type",type);
	if(type=="text"){
		label.appendChild(text);
		label.appendChild(input);
		input.setAttribute("spellcheck",false);
	}else{
		if(type=="range"){
			label.appendChild(text);	
			label.appendChild(input);
		}else{
			label.appendChild(input);
			label.appendChild(text);
		}
	}
	span.appendChild(label);
	group.appendChild(span);
	return input;
}

let ToolbarCount=0;

function addToolbar(group,handler){
	const div=document.createElement("div");
	div.className="group";
	div.id="toolbar-"+(ToolbarCount++)
	group.appendChild(div);
	if(handler){
		div.setAttribute("tabindex",1);
		div.onkeydown=handler;
		div.onkeyup=handler;
	}
	return div;
}
