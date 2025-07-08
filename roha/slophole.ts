// slophole.ts
// (c)2025 nitrologic 
// All rights reserved

// [hole] slophole a slop.ts worker

interface SlopHoleMessage {
	command?: string;
	data?: any;
	message?: string;
	connected?: boolean;
	disconnected?: boolean;
}

// [hole] fountain slopPipe worker thread

function echo(...data: any[]){
	console.log("[hole]",data);
}

let slopPipe:Deno.Conn;

const rxBufferSize=1e6;

const rxBuffer = new Uint8Array(rxBufferSize);

async function writeFountain(message:string){
	if(!slopPipe) return;
	const data=encoder.encode(message);	
	let offset = 0;
//	echo("writing",message);
	while (offset < data.length) {
		const written = await slopPipe.write(data.subarray(offset));
		offset += written;
	}
	echo("wrote",message);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function connectFountain():Promise<boolean>{
	try{
		slopPipe = await Deno.connect({hostname:"localhost",port:8081});
		echo("slopPipe connected","localhost:8081");
		return true;
	}catch(error){
		if (error instanceof Deno.errors.ConnectionRefused) {
			echo("Connection Refused",error.message);
		}else{
			const message=JSON.stringify(error);
			echo("Connection Error",message);
		}
	}
	return false;
}

function disconnectFountain(){
	if(!slopPipe) return false;
	slopPipe.close();
	echo("slopPipe disconnected");
	slopPipe=null;
	return true;
}

let readingSlop:bool=false;

async function readFountain(){
	if(!slopPipe) return;
	readingSlop=true;
	echo(readingSlop);
	const n = await slopPipe.read(rxBuffer);
	if (n !== null) {
		const received = rxBuffer.subarray(0, n);
		const message = decoder.decode(received);
		echo("slopPipe received:", message);		
		self.postMessage({received:message});
	}
	readingSlop=false;
}

self.onmessage = async(e) => {
	const command=e.data.command;
	const data=e.data.data;

	switch(command){
		case "open": {
			const connected=await connectFountain()
			self.postMessage({connected})
		};
		break;
		case "close": {
			const disconnected=await disconnectFountain()
			self.postMessage({disconnected})
		};
		break;
		case "write":{
			const payload=JSON.stringify(data);
			await writeFountain(payload);
		}
		break;
		case "read":{
			if(!readingSlop){
				readFountain();
			}
		}
		break;
		default:
			echo("slophole ignored command:",e.data.command);
	}
};
