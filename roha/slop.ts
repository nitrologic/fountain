// slop.ts
// (c)2025 Simon Armstrong 
// All rights reserved

let slopPail:unknown[]=[];

function logSlop(_result:any){
	const message=JSON.stringify(_result);
	console.error("\t[slop]",message);
	slopPail.push(message);
}

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}

