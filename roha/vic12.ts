// vic12.ts - a 12 bit slop machine
// Copyright (c) 2025 Simon Armstrong

import { sleep } from "https://deno.land/x/openai@v4.69.0/core.ts";

// All rights reserved

// 88 x 40 = 3520 pixel display

const vic12={
	spec:{
		resolution:[88,40],
		aspect:{pal:[1,1]}
	}
};

//const hlin="🟣".repeat(88)+"\n";
//const scr=hlin.repeat(40);
//console.log(scr);

// grok code ahead

const chars = ["🟣", "🔵", "🟢", "🟡", "🔴"];
let frame = 0;

function generateFrame(char: string): string {
	const res=vic12.spec.resolution;
	const hlin=char.repeat(res[0])+"\n";
	return hlin.repeat(res[1]);
}

const Clear="\x1B[2J";
const Home="\x1B[H";
const StartFrame=Home+Clear;
const EndFrame=Home;

async function sleep(ms:number){
	await new Promise((resolve) => setTimeout(resolve,ms));
}

async function animate() {
	const startTime = Date.now();
	const duration = 3000;
	const delay = 500;

	while (Date.now() - startTime < duration) {
		const currentChar = chars[frame % chars.length];
		console.log(StartFrame+generateFrame(currentChar)+EndFrame);
		frame++;
		await sleep(delay);
	}
	console.log("Animation complete!");
}

animate();
