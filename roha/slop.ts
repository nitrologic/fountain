// slop.ts - skeleton code for slop services

// (c)2025 Simon Armstrong 
// Licensed under the MIT License - See LICENSE file

let slopPail:unknown[]=[];

function logSlop(_result:any){
	const message=JSON.stringify(_result);
	console.error("\t[slop]",message);
	slopPail.push(message);
}

async function sleep(ms:number) {
	await new Promise(function(resolve) {setTimeout(resolve, ms);});
}
