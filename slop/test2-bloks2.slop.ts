// worker.ts

// emits events start error tick

const MaxFrame=120;
const period=100;

const tvWidth=128;
const tvHeight=32;

const quads=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

const AnsiDefault="\x1B[39m";
const AnsiPink="\x1B[38;5;206m";
const AnsiRGB="\x1B[38;2;"//⟨r⟩;⟨g⟩;⟨b⟩m"

class pixels{
	width: number;
	height: number;
	bitmap: Uint16Array;
	colmap: Uint8Array;
	constructor(width:number,height:number) {
		this.width = width;
		this.height = height;
		const words=((width+15)/16)|0;
		this.bitmap=new Uint16Array(words*height);
		this.colmap=new Uint8Array(width*height/4);
	}
	clear(shade:number){
		this.bitmap.fill(0);
		this.colmap.fill(0);
	}
	noise(shade:number){
		const n=this.bitmap.length;
		for(let xy=0;xy<n;xy++){
			let bits=0;
			for(let i=0;i<16;i++){
				if(Math.random()<shade) bits|=(1<<i);
			}
//			const r:number=Math.random()*0xffff;
			this.bitmap[xy]=bits;
		}
		const c=this.colmap.length;
		for(let xy=0;xy<c;xy++){
			const col8=16+(Math.random()*216)|0;
			this.colmap[xy]=col8;
		}
	}
	frame():string[]{
		const w=this.width;
		const h=this.height;
		const words=((w+15)/16)|0;
		const bitmap=this.bitmap;
		const cols:number=w/2;
		const rows:number=h/2;
		const lines:string[]=[];
		for(let y:number=0;y<rows;y++){
			let line:string[]=[];
			const y0=y*2+0;
			const y1=y*2+1;
			for(let x:number=0;x<cols;x++){
				const w0=bitmap[y0*words+(x>>3)|0];
				const w1=bitmap[y1*words+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				const index:number=(w0&bit0?1:0)+(w0&bit1?2:0)+(w1&bit0?4:0)+(w1&bit1?8:0);
				const q4=quads.charAt(index);
				const gcode=0xe8+(Math.random()*24)|0;
				const grey="\x1B[38;5;"+gcode+"m";
				const rgb=AnsiRGB+(Math.random()*255|0)+";"+(Math.random()*255|0)+";"+(Math.random()*255|0)+"m";
				// 36 × r + 6 × g + b
				//const hcode=0x10+(Math.random()*216)|0;
				const col8=this.colmap[y*cols+x];
				const fg8="\x1B[38;5;"+col8+"m";
				line.push(fg8+q4);
			}
			lines.push(line.join(""));
		}
		return lines;
	}
}

let tv:pixels=new pixels(tvWidth,tvHeight);
const startTime=performance.now();
let frameCount=-1;

function update(events:any[]){
	console.log("update",events);
}

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			const size=slip.consoleSize;
			if(size){
				const w=size.columns*2;
				tv=new pixels(w,size.rows*2-3);
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
	tv.noise(shade);
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
