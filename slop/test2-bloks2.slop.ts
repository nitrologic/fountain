// worker.ts

import { pixelMap } from "./sloputil.ts";

// emits events start error tick

const MaxFrame=120;
const period=100;

const tvWidth=128;
const tvHeight=32;

let tv:pixelMap=new pixelMap(tvWidth,tvHeight);
const startTime=performance.now();
let frameCount=-1;

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

function blankFrame(){
	const t=performance.now();
	const shade=(t/3e3)%1;
//	tv.noise(shade);
//	tv.blank(shade);
	tv.cls(shade);
	for(let i=0;i<100;i++){
		tv.plot(i,i);
	}
	return tv.frame().join("\n");
}

function tick() {
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	const time=performance.now();
	const frame=(count>=0 && count<MaxFrame)?blankFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=tick();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
