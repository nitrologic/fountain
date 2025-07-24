// worker.ts
// emits events start error tick

import { pixelMap } from "./sloputil.ts";

const spritestxt=await Deno.readTextFile("../slop/test-sprites.txt");
//console.log(spritestxt);
const sprites=spritestxt.split(/\n\s*\n/);
//console.log("sprites=",sprites.length);

const period=100;	//10hz chunky pixel display

const MaxFrame=120;

const tvWidth=128;
const tvHeight=32;

// pico is 240 x 135


// pixelMap is currently colored foreground 2x2 blocks on ansi background

let tv:pixelMap=new pixelMap(tvWidth,tvHeight);
const startTime=performance.now();
let frameCount=-1;

function blankFrame(){
	const t=performance.now();
//	const shade=(t/3e3)%1;
//	tv.noise(shade);
//	tv.blank(0.8);
	tv.cls(0.8);
	for(let i=0;i<100;i++){
		tv.plot(i,i);
	}
	tv.draw(sprites[0],12,2);
	tv.draw(sprites[1],16,7);
	tv.draw(sprites[0],0,12);
	return tv.frame().join("\n");
}

function tick() {
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	const time=performance.now();
	const frame=(count>=0 && count<MaxFrame)?blankFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

function update(events:any[]){
//	console.log("update",events);
}

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			const size=slip.consoleSize;
			if(size){
				const w=size.columns*2;
				tv=new pixelMap(w,size.rows*2-4);
			}
			break;
		case "update":
			const events=slip.events;
			update(events);
			break;
		case "stop":
			frameCount=0;
			break;
	}
};

setInterval(()=>{const reply=tick();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
