import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";                                                                                                                                                                             

async function servePath(request:Request,path:string):Promise<Response>{
//	console.log("[slop] servePath",path);
	return await serveFile(request,path);
}

// [slop] session

const hostName=Deno.hostname();
const userName="slop"+Deno.uid;

let sessionCount=0;

function sysInfo(request:Request){
	++sessionCount;
	const result={hostName,userName,sessionCount};
//	echo("sysInfo",request,result);
	return {jsonrpc:request.jsonrpc,id:request.id,result};
}

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

const slopVersion=0.1;

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
			case "sys.clocks":
				result=sysClocks(rpc);
				break;
			case "sys.memory":
				result=sysMemory(rpc);
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
		case "/slop.js":
		case "/slop.css":
		case "/favicon.ico":{
			const response=await servePath(request,"."+path);
			return response;
		}
	}
	console.log("[slop] File Not Found path:",path);
	return new Response("Not Found",{status:404});
});
