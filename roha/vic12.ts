// vic12.ts - a 12 bit slop machine
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

// 96 x 64 = hires 
// 88 x 40 = medium 3520 pixels
// 44 x 24 = lores 1056 pixels

const vic12={
	spec:{
		resolution:[44,24],
		aspect:{pal:[1,1]}
	}
};

// grok code ahead

const dots = ["🟣", "🔵", "🟢", "🟡", "🔴"];

const boxChars=["┌┐└┘─┬┴│┤├┼","╔╗╚╝═╦╩║╣╠╬","┏┓┗┛━┳┻┃┫┣╋"];

const wbox=["┌─","─┐","└─","─┘","──","┬─","┴─","│ ","┤ ","├─","┼┼"];

let frameCount = 0;

function solidFrame(char: string): string {
	const res=vic12.spec.resolution;
	const hlin=char.repeat(res[0])+"\n";
	return hlin.repeat(res[1]);
}

const ShowCursor = "\x1b[?25h"
const HideCursor = "\x1b[?25l"

const Background0="\x1b[48;2;⟨0⟩;⟨0⟩;⟨0⟩m"

const Clear="\x1B[2J";
const Home="\x1B[H";
const StartFrame=Home+Clear;
const EndFrame=Home;

async function sleep(ms:number){
	await new Promise((resolve) => setTimeout(resolve,ms));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function flipFrame(frame:string){
	await Deno.stdout.write(encoder.encode(StartFrame + frame));
}

async function animate() {
	const startTime = Date.now();
	const duration = 7000;
	const delay = 500;
	while (true) {
		const elapsed=Date.now() - startTime;
		if(elapsed > duration) break;
		const currentChar = dots[frameCount % dots.length];
		const frame=solidFrame(currentChar);
//		console.log(StartFrame+frame);
		await flipFrame(frame);
		frameCount++;
		await sleep(delay);
	}
}

console.log(Background0);
console.log(HideCursor);
await animate();
console.log(ShowCursor);
