// sloputil.ts
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

export const quads=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

const AnsiRGB="\x1B[38;2;" //+"⟨r⟩;⟨g⟩;⟨b⟩m"

export class pixelMap{
	width: number;
	height: number;
	span: number;
	wordmap: Uint16Array;
	colmap: Uint8Array;
	constructor(width:number,height:number) {
		this.width = width;
		this.height = height;
		this.span=((width+15)/16)|0;
		this.wordmap=new Uint16Array(this.span*height);
		this.colmap=new Uint8Array(width*height/4);
	}
	cls(shade:number){
		const grey=0xe8+(shade*23)|0;
		this.wordmap.fill(0);
		this.colmap.fill(grey);
	}
	blank(shade:number){
		const grey=0xe8+(shade*23)|0;
		this.wordmap.fill(0xffff);
		this.colmap.fill(grey);
	}
	draw(sprite:string,x:number,y:number){
		x|=0;y|=0;
		const lines=sprite.split("\n");
		for(const line of lines){
			for(let xx=0;xx<line.length;xx++){
				if(line.charAt(xx)=="*") this.plot(x+xx,y);
			}
			y++;
		}
	}
	vlin(x:number,y:number,h:number){
		const bit=1<<(x&15);
		let index=y*this.span+(x>>4);
		while(h-->0){
			this.wordmap[index]|=bit;
			index+=this.span;
		}
	}
	hlin(x:number,y:number,w:number){
		const bit=1<<(x&15);
		while(w-->0){
			let index=y*this.span+(x>>4);
			this.wordmap[index]|=bit;
			x++;
		}
	}
	plot(x:number,y:number){
		const bit=1<<(x&15);
		const index=y*this.span+(x>>4);
		this.wordmap[index]|=bit;
	}
	clear(x:number,y:number){
		const mask=0xffff-(1<<(x&15));
		const index=y*this.span+(x>>4);
		this.wordmap[index]&=mask;
	}
	noise(shade:number){
		const n=this.wordmap.length;
		for(let xy=0;xy<n;xy++){
			let bits=0;
			for(let i=0;i<16;i++){
				if(Math.random()<shade) bits|=(1<<i);
			}
//			const r:number=Math.random()*0xffff;
			this.wordmap[xy]=bits;
		}
		const c=this.colmap.length;
		for(let xy=0;xy<c;xy++){
			const col8=16+(Math.random()*216)|0;
			this.colmap[xy]=col8;
		}
	}
	frameQuads():string[]{
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols:number=w/2;
		const rows:number=h/2;
		const lines:string[]=[];
		for(let y:number=0;y<rows;y++){
			let line:string[]=[];
			const y0=y*2+0;
			const y1=y*2+1;
			for(let x:number=0;x<cols;x++){
				const w0=wordmap[y0*span+(x>>3)|0];
				const w1=wordmap[y1*span+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				const index:number=(w0&bit0?1:0)+(w0&bit1?2:0)+(w1&bit0?4:0)+(w1&bit1?8:0);
				const q4=quads.charAt(index);
				const col8=this.colmap[y*cols+x];
//				const gcode=0xe8+(Math.random()*24)|0;
				const gcode=(col8)|0;
				const grey="\x1B[38;5;"+gcode+"m";
				const rgb=AnsiRGB+(Math.random()*255|0)+";"+(Math.random()*255|0)+";"+(Math.random()*255|0)+"m";
				// 36 × r + 6 × g + b
				//const hcode=0x10+(Math.random()*216)|0;
				const fg8="\x1B[38;5;"+col8+"m";
//				line.push(fg8+q4);
				line.push(grey+q4);
			}
			lines.push(line.join(""));
		}
		return lines;
	}

	frame():string[]{	//Braille
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols:number=(w/2)|0;
		const rows:number=(h/4)|0;
		const lines:string[]=[];
		for(let y:number=0;y<rows;y++){
			let line:string[]=[];
			const y0=y*4+0;
			const y1=y*4+1;
			const y2=y*4+2;
			const y3=y*4+3;
			for(let x:number=0;x<cols;x++){
				const w0=wordmap[y0*span+(x>>3)|0];
				const w1=wordmap[y1*span+(x>>3)|0];
				const w2=wordmap[y2*span+(x>>3)|0];
				const w3=wordmap[y3*span+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				const b8:number=BrailleCode+
					(w0&bit0?1:0)+
					(w0&bit1?8:0)+
					(w1&bit0?2:0)+
					(w1&bit1?16:0)+
					(w2&bit0?4:0)+
					(w2&bit1?32:0)+
					(w3&bit0?64:0)+
					(w3&bit1?128:0);
				line.push(String.fromCharCode(b8));
			}
			lines.push(line.join(""));
		}
		return lines;
	}
}

const BrailleCode=0x2800;
const BrailleOrder=[1,4,2,5,3,6,7,8];
