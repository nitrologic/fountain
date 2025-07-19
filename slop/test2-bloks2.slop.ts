// worker.ts

// emits events start error tick

const tvWidth=100;
const tvHeight=44;

const MaxFrame=250;
const period=20;

const quads=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

class pixels{
	width: number;
	height: number;
	bitmap: Uint16Array;
	constructor(width:number,height:number) {
		this.width = width;
		this.height = height;
		const words=((width+15)/16)|0;
		this.bitmap=new Uint16Array(words*height);
	}
	clear(){
		const n=this.bitmap.length;
		for(let xy=0;xy<n;xy++){
			const r:number=Math.random()*0xffff;
			this.bitmap[xy]=(r|0);
		}
	}
	frame():string[]{
		const w=this.width;
		const h=this.height;
		const words=(w+15)/16;
		const bitmap=this.bitmap;
		const cols:number=h/2;
		const rows:number=w/2;
		const lines:string[]=[];
		for(let y:number=0;y<cols;y++){
			let line:string[]=[];
			const y0=y*2+0;
			const y1=y*2+1;
			for(let x:number=0;x<rows;x++){
				const w0=bitmap[y0*words+(x>>3)|0];
				const w1=bitmap[y1*words+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				const index:number=(w0&bit0?1:0)+(w0&bit1?2:0)+(w1&bit0?4:0)+(w1&bit1?8:0);
				const q4=quads.charAt(index);
				line.push(q4);
			}
			lines.push(line.join(""));
		}
		return lines;
	}
}

const tv:pixels=new pixels(tvWidth,tvHeight);
const startTime=performance.now();
let frameCount=0;

function update(events:any[]){
	console.log("update",events);
}

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
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
	tv.clear();
	return tv.frame().join("\n");
}

function tick() {
	const count=frameCount++;
	const time=performance.now();
	const frame=(count<MaxFrame)?blankFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=tick();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
