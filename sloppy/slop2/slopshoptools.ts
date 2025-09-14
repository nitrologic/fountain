// slopshoptools.ts - utility functions
// (c)2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

export const Ansi={
	Reset:"\x1BC",
	Defaults:"\x1B[0m",//"\x1B[39;49m",//\x1B[0m",
	Home:"\x1B[H",
	Aqua:"\x1B[38;5;122m",
	Pink:"\x1B[38;5;206m",
	HideCursor:"\x1b[?25l",
	ShowCursor:"\x1b[?25h",
	Cursor:"\x1B["//+ row + ";1H"
}

// const quads=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
// slopsite utility functions
// typescript ahead - fix the any

let _outputBuffer:string[]=[];
let _printBuffer=[];
let _markdownBuffer=[];

export function toString(arg:any):string{
	if (typeof arg === 'object') {
		return JSON.stringify(arg);
	}
	return String(arg);
}

export async function fileLength(path:string) {
	const stat=await Deno.stat(path);
	return stat.size;
}

export function echo(...args:any[]){
//	const args=arguments.length?Array.from(arguments):[];
	const lines=[];
	for(const arg of args){
		const line=toString(arg);
		lines.push(line);
	}
	_outputBuffer.push(lines.join(" "));
}
