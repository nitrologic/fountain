import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";                                                                                                                                                                             

async function servePath(request:Request,path:string):Promise<Response>{
//	console.log("servePath",path);
	return await serveFile(request,path);
}

const slopVersion=0.1;
const pid=Deno.pid.toString();
Deno.env.set("slop",pid);
console.log("slop",slopVersion,pid);

Deno.serve(async (request) => {
	const url=request.url;
	const slash=url.lastIndexOf("/");
	const name=(slash!=-1)?url.substring(slash+1):url;
	switch(name){
		case "":{
			const response=await servePath(request,"slop.html");
			return response;
		}
		case "slop.js":
		case "slop.css":
		case "favicon.ico":{
			const response=await servePath(request,name);
			return response;
		}
	}
	console.log("url:",url,"name:",name);
	return new Response("[Slop Fountain] URL Not Found "+url,{status:404});
});
