// sloputil.js
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

export const BrailleCode=0x2800;

export const QuadChars=" ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

export const SixShades=" ░▒▓██";
export const SixShades2="██▓▒░ ";

export const AnsiRGB="\x1B[38;2;" //+"⟨r⟩;⟨g⟩;⟨b⟩m"

export function greyShade(shade){
	const grey=0xe8+(shade*23)|0;
	return grey;
}

function ansiFG(col8){
	const fg8="\x1B[38;5;"+col8+"m";
	return fg8;
}

export function edgeFrame(fb,edge){
	const lines=[];
	let y=0;
	for(const charline of fb){
		const prefix=edge[y]||"";
		lines.push(prefix+charline);
		y++;
	}
	return lines;
}


export class pixelMap{
	width;
	height;
	span;
	wordmap;	//Uint16Array;
	leftEdge;
	
	constructor(width,height) {
		this.width = width;
		this.height = height;
		this.span=((width+15)/16)|0;
		this.wordmap=new Uint16Array(this.span*height);
		this.leftEdge=[""];
	}
	point(x,y){
		const bit=1<<(x&15);
		const w16=this.wordmap[y*this.span+(x>>4)];
		return(w16&bit)==bit;
	}
	blit(srcPixels,destx,desty){
		for(let y=0;y<srcPixels.height;y++){
			const dy=(desty+y)|0;
			if(dy>=0 && dy<this.height){
				for(let x=0;x<srcPixels.width;x++){
					const dx=(destx+x)|0;
					if(dx>=0 && dx<this.width){
						if(srcPixels.point(x,y)) this.plot(dx,dy)
					}
				}
			}
		}
	}
	cls(c8){
		this.wordmap.fill(0);
		this.leftEdge.fill("");
		this.leftEdge[0]=ansiFG(c8);
	}
	blank(c8){
		this.wordmap.fill(0xffff);
		this.leftEdge[0]=ansiFG(c8);
	}
	draw(sprite,x,y){
		x|=0;y|=0;
		const lines=sprite.split("\n");
		for(const line of lines){
			for(let xx=0;xx<line.length;xx++){
				const char=line.charAt(xx);
				if(char=="*"||char=="#") this.plot(x+xx,y);
			}
			y++;
		}
	}
	// draws sprite in -x,y space
	drawleft(sprite,x,y){
		x|=0;y|=0;
		const lines=sprite.split("\n");
		for(const line of lines){
			for(let xx=0;xx<line.length;xx++){
				const char=line.charAt(xx);
				if(char=="*"||char=="#") this.plot(x-xx,y);
			}
			y++;
		}
	}

	rect(x0,y0,w,h){
		for(let y=y0;y<y0+h;y++){
			for(let x=x0;x<x0+w;x++){
				const index=y*this.span+(x>>4);
				const bit=1<<(x&15);
				this.wordmap[index]|=bit;
			}
		}
	}
	vlin(x,y,h){
		const bit=1<<(x&15);
		let index=y*this.span+(x>>4);
		while(h-->0){
			this.wordmap[index]|=bit;
			index+=this.span;
		}
	}
	hlin(x,y,w){
		const bit=1<<(x&15);
		while(w-->0){
			let index=y*this.span+(x>>4);
			this.wordmap[index]|=bit;
			x++;
		}
	}
	plot(x,y){
		// TODO: fastPlot version without this guff
		x|=0;y|=0;if(x<0||x>=this.width||y<0||y>=this.height) return;
		const bit=1<<(x&15);
		const index=y*this.span+(x>>4);
		this.wordmap[index]|=bit;
	}
	clear(x,y){
		// TODO: fastPlot version without this guff
		x|=0;y|=0;if(x<0||x>=this.width||y<0||y>=this.height) return;
		const mask=0xffff-(1<<(x&15));
		const index=y*this.span+(x>>4);
		this.wordmap[index]&=mask;
	}
	noise(shade){
		const n=this.wordmap.length;
		for(let xy=0;xy<n;xy++){
			let bits=0;
			for(let i=0;i<16;i++){
				if(Math.random()<shade) bits|=(1<<i);
			}
//			const r=Math.random()*0xffff;
			this.wordmap[xy]=bits;
		}
	}

	// shades 0..4 from counting bits in a 2x2 sample
	ditherFrame(shades=" ░▒▓██"){
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols=w/2;
		const rows=h/2;
		const lines=[];
		for(let y=0;y<rows;y++){
			let line=[];
			for(let x=0;x<cols;x++){
				const w0=wordmap[(y*2+0)*span+(x>>3)|0];
				const w1=wordmap[(y*2+1)*span+(x>>3)|0];
				const pos0=(x&7)*2;
				const pos1=pos0+1;
				const count=((w0>>pos0)&1)+((w0>>pos1)&1) + ((w1>>pos0)&1)+((w1>>pos1)&1);
				const q1=shades.charAt(count);
				line.push(q1);
			}
			lines.push(line.join(""));
		}
		return lines;
	}

	charFrame(char0,char1){
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols=w;
		const rows=h;
		const lines=[];
		for(let y=0;y<rows;y++){
			let line=[];
			for(let x=0;x<cols;x++){
				const w0=wordmap[y*span+(x>>4)|0];
				const bit=1<<(x&15);
				const q1=w0&bit?char0:char1;
				line.push(q1);
			}
			lines.push(line.join(""));
		}
		return lines;
	}

	widecharFrame(char0,char1){
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols=w;
		const rows=h;
		const lines=[];
		for(let y=0;y<rows;y++){
			let line=[];
			let wides=0;
			for(let x=0;x+wides<cols;x++){
				const w0=wordmap[y*span+(x>>4)|0];
				const bit=1<<(x&15);
				if((w0&bit)==0 && wides>0){
					wides--;
				}else{
					const ch=w0&bit?char0:char1;
					line.push(ch);
					let code=ch.charCodeAt(0);
					if(code>128) wides++;
				}
			}
			lines.push(line.join(""));
		}
		return lines;
	}

	quadFrame(){
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols=w/2;
		const rows=h/2;
		const lines=[];
		for(let y=0;y<rows;y++){
			let line=[];
			const y0=y*2+0;
			const y1=y*2+1;
			for(let x=0;x<cols;x++){
				const w0=wordmap[y0*span+(x>>3)|0];
				const w1=wordmap[y1*span+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				const index=(w0&bit0?1:0)+(w0&bit1?2:0)+(w1&bit0?4:0)+(w1&bit1?8:0);
				const q4=QuadChars.charAt(index);
				line.push(q4);
			}
			lines.push(line.join(""));
		}
		return lines;
	}

	brailleFrame(){	//Braille
		const w=this.width;
		const h=this.height;
		const span=((w+15)/16)|0;
		const wordmap=this.wordmap;
		const cols=(w/2)|0;
		const rows=(h/4)|0;
		const lines=[];
		for(let y=0;y<rows;y++){
			let line=[];
			const y0=y*4+0;
			const y1=y*4+1;
			const y2=y*4+2;
			const y3=y*4+3;
			for(let x=0;x<cols;x++){
				const w0=wordmap[y0*span+(x>>3)|0];
				const w1=wordmap[y1*span+(x>>3)|0];
				const w2=wordmap[y2*span+(x>>3)|0];
				const w3=wordmap[y3*span+(x>>3)|0];
				const bit0=1<<((x*2+0)&15);
				const bit1=1<<((x*2+1)&15);
				//const BrailleOrder=[1,4,2,5,3,6,7,8];
				const b8=BrailleCode+
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

	// uses this.leftEdge to prefix lines

}

export async function loadSprites(path){
	const spritestxt=await Deno.readTextFile(path);
	//console.log(spritestxt);
	const sprites=spritestxt.split(/\n\s*\n/);
	//console.log("sprites=",sprites.length);
	return sprites
}
