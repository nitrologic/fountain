// worker.ts

// emits events start error tick

const dots=" 𓃉 𓃊 𓃋 𓃌 𓃍 𓃎 𓃏 𓃐 𓃑 ";

const period=20;
const startTime=performance.now();
let frameCount=0;

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			break;
		case "stop":
			frameCount=0;
			break;
	}
};

const quads=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
class pixels{
	width: number;
	height: number;
	bits: boolean[];
	constructor(width:number,height:number) {
		this.width = width;
		this.height = height;
		this.bits = new Array(width*height).fill(false);
	}
	clear(){
		const n=this.bits.length;
		for(let xy=0;xy<n;xy++){
			const r=Math.random();
			this.bits[xy]=r>0.3?true:false;
		}
	}
	frame():string[]{
		const w=this.width;
		const h=this.height;
		const bits=this.bits;
		const cols:number=h/2;
		const rows:number=w/2;
		const lines:string[]=[];
		for(let y:number=0;y<cols;y++){
			let line:string[]=[];
			const y0=2*y*w;
			const y1=y0+w;
			for(let x:number=0;x<rows;x++){
				const b4:boolean[]=[
					bits[y0+x*2+0],
					bits[y0+x*2+1],
					bits[y1+x*2+0],
					bits[y1+x*2+1]
				];
				const index:number=(b4[0]?1:0)+(b4[1]?2:0)+(b4[2]?4:0)+(b4[3]?8:0);
				const q4=quads.charAt(index);
				line.push(q4);
			}
			lines.push(line.join(""));
		}
		return lines;
	}
};

const tv:pixels=new pixels(160,26);

function blankFrame(){
	tv.clear();
	return tv.frame().join("\n");
}

function update() {
	const count=frameCount++;
	const time=performance.now();
	const frame=(count<650)?blankFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=update();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
