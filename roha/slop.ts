// slop.ts
// (c)2025 nitrologic 
// All rights reserved

import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";                                                                                                                                                                             

const sessionName="slop"
let sessionCount=0;

const rxBufferSize=1e6;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// [slop] echo

function echo(data:string|[]){
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
	const session=sessionName+sessionCount;
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

// [slop] fountain slopPipe

let slopPipe:Deno.TcpConn;

async function connectFountain(){
	try{
		slopPipe = await Deno.connect({hostname:"localhost",port:8081});
		console.log("Connected to server");
	}catch(e){//ConnectionRefused){
		console.log("Connection failure with server");
//		console.log(e);
	}
}

async function disconnectFountain(){
	if(!slopPipe) return;
	slopPipe.close();
	slopPipe=null;
}

async function writeFountain(message:string){
	if(!slopPipe) return;
	await slopPipe.write(encoder.encode(message));
}

async function readFountain(){
	if(!slopPipe) return;
	const buffer = new Uint8Array(rxBufferSize);
	const n = await slopPipe.read(buffer);
	if (n !== null) {
		const received = buffer.subarray(0, n);
		console.log("Received:", decoder.decode(received));
	}
}

//await sendAndReceive("Hello, server!");
//await sendAndReceive("Another message");
//conn.close();
//console.log("Connection closed");	

echo("sleeping");
await sleep(7500);
echo("connecting to fountain");
await connectFountain();
echo("reading fountain");
await readFountain();
echo("serving http:8000");

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
