// slop.ts
// (c)2025 nitrologic 
// All rights reserved

import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";                                                                                                                                                                             

const slopPid=Deno.pid;
const sessionName="slop"+slopPid;
let sessionCount=0;

const greet=sessionName+" server says hello into the slop hole";

// [slop] echo

function echo(...data:any[]){
	console.log("[slop]",data);
}

// [slop] sleep

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

// [slop] serve files

async function servePath(request:Request,path:string):Promise<Response>{
//	console.log("[slop] servePath",path);
	return await serveFile(request,path);
}

// [slop] host session

const hostName=Deno.hostname();
const userName=Deno.env.get("USERNAME")||"root";
const platform=(Deno.uid()||"Windows")+" "+Deno.osRelease();

interface JsonRPCRequest{
	jsonrpc:string, //"2.0"
	id:string,
	error?:string,
	method: string;
	params?: Record<string, unknown> | unknown[];
}

interface JsonRPCResponse {
	jsonrpc: string;
	id: string;
	result: Record<string, unknown> | unknown[];
}

function sysInfo(request:JsonRPCRequest):JsonRPCResponse{
	++sessionCount;
	const session=sessionName+"."+sessionCount;
	const result={hostName,userName,platform,session};
//	echo("sysInfo",request,result);
	return {jsonrpc:request.jsonrpc,id:request.id,result};
}

function sysTick(request:JsonRPCRequest):JsonRPCResponse{
	const _result:unknown[]=[];
	return {jsonrpc:request.jsonrpc,id:request.id,result:{messages:_result}};
}
function sysPorts(request:JsonRPCRequest):JsonRPCResponse{
	const _result:unknown[]=[];
	return {jsonrpc:request.jsonrpc,id:request.id,result:_result};
}
function sysConnect(request:JsonRPCRequest):JsonRPCResponse{
	const result={};
	return {jsonrpc:request.jsonrpc,id:request.id,result};
}
function sysConnections(request:JsonRPCRequest):JsonRPCResponse{
	const result={};
	return {jsonrpc:request.jsonrpc,id:request.id,result};
}

const slopVersion=0.1;

// Creating a basic worker (main.ts)
let worker:Worker = new Worker(new URL("./slophole.ts", import.meta.url).href, {type: "module"});

function closeSlopHole(){
	worker.postMessage({ command: "close" });
}

function writeSlopHole(content:string){
	worker.postMessage({ command: "write", data:{slop:[content]} });
}

worker.onmessage = (message) => {
	const payload=message.data;//ports,origin.lastEventId JSON.stringify(payload)
	echo("worker rx payload:", payload);	
	if(payload.connected){
		writeSlopHole(greet);
//		worker.postMessage({ command: "write", data:greet });
	}
	if(payload.disconnected){
		worker.terminate(); // Stop the worker when done
		worker=null;
	}
};

worker.onerror = (e) => {
	console.error("Worker error:", e.message);
};

await sleep(10e3);

worker.postMessage({ command: "open", data: [1, 2, 3, 4] });


// [slop] serve http requests

Deno.serve(async (request) => {
	const url = new URL(request.url);
	const path = decodeURIComponent(url.pathname);
	if (path.startsWith("/api")) {
		if (request.method !== "POST") {
			return new Response("POST Method Not Allowed", { status: 405 });
		}
		const bytes = await request.arrayBuffer();
		const text = new TextDecoder().decode(new Uint8Array(bytes));
		const rpc=JSON.parse(text);
		const method=rpc.method;
		let result=null;
		switch(method){
			case "sys.info":
				result=sysInfo(rpc);
				break;
			case "sys.tick":
				result=await sysTick(rpc);
				break;
			case "sys.ports":
				result=await sysPorts(rpc);
				break;
			case "sys.connect":
				result=await sysConnect(rpc);
				break;
			case "sys.connections":
				result=await sysConnections(rpc);
				break;
			default:
				return new Response("Not Found", { status: 404 });
		}
		console.log("[slop]",JSON.stringify(result));
		const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
		return new Response(JSON.stringify(result),{headers});
	}
	switch(path){
		case "/":{
			const response=await servePath(request,"slop.html");
			return response;
		}
		case "/slopstudio.js":
		case "/slopdom.js":
		case "/slop.css":
		case "/favicon.ico":{
			const response=await servePath(request,"."+path);
			return response;
		}
	}
	console.log("[slop] File Not Found path:",path);
	return new Response("Not Found",{status:404});
});
