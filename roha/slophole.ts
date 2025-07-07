// slophole.ts
// (c)2025 nitrologic 
// All rights reserved

// [slop] fountain slopPipe worker thread

function echo(...data: any[]){
	console.log("[hole]",data);
}

let slopPipe:Deno.Conn;
async function writeFountain(message:string){
	if(!slopPipe) return;
	const data=encoder.encode(message);	
	let offset = 0;
	echo("writing",message);
	while (offset < data.length) {
		const written = await slopPipe.write(data.subarray(offset));
		offset += written;
	}
	echo("wrote",message);
}

const rxBufferSize=1e6;

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

async function readFountain(){
	if(!slopPipe) return;
	const buffer = new Uint8Array(rxBufferSize);
	const n = await slopPipe.read(buffer);
	if (n !== null) {
		const received = buffer.subarray(0, n);
		echo("Received:", decoder.decode(received));
	}
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
			readFountain();
		}
		break;
		default:
			echo("slophole ignored command:",e.data.command);
	}
};
