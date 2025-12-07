// gif16.ts - streams gif (fixed)
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

const c64_rgb = [
	0,0,0, // 0: Black
	255,255,255, // 1: White
	136,0,0, // 2: Red
	170,255,238, // 3: Cyan
	204,68,204,// 4: Purple
	0,204,85,// 5: Green
	0,0,170, // 6: Blue
	238,238,119, // 7: Yellow
	221,136,85,// 8: Orange
	102,68,0,// 9: Brown
	255,119,119, // 10: Light Red
	51,51,51,// 11: Dark Grey
	119,119,119, // 12: Grey
	170,255,102, // 13: Light Green
	0,136,255, // 14: Light Blue
	187,187,187// 15: Light Grey
];

const u16le=(n:number):number[]=>[n&255,n>>8&255];
const header="GIF89a".split("").map(c=>c.charCodeAt(0));

class GIF16{
	#w:number;
	#h:number;
	#bg:number;
	#pal:Uint8Array;
	#frame:Uint8Array;
	#bytes:number[]=[];

	constructor(
		width=320,
		height=200,
		palette=new Uint8Array(c64_rgb),
		borderIndex=6,
	){
		this.#w=width;
		this.#h=height;
		this.#bg=borderIndex&15;
		this.#pal=palette;
		this.#frame=new Uint8Array(width*height);
		this.#bytes.push(...header,...this.#lsd(),...this.#gct(),...this.#appext());
	}

	setPixel(x:number,y:number,c:number){
		if(x>=0&&x<this.#w&&y>=0&&y<this.#h) this.#frame[y*this.#w+x]=c&15;
	}

	setBorder(c:number){
		this.#bg=c&15;
	}

	addBlank(delay=20) {
		const frame=this.#frame;
		frame.fill(this.#bg);
		this.#writeFrameBuffer(frame, delay);
	}

	addFrame(delay=20,px=0,py=0){
		const frame=this.#frame;
		this.#writeFrameBuffer(frame, delay);
	}

	finish(){this.#bytes.push(0x3B);return new Uint8Array(this.#bytes);}

	#writeFrameBuffer(buffer: Uint8Array, delay: number) {
		const lzwData = this.#compress(buffer);
		// GCE: Reserved(000) | Disposal(000=Unspecified) | Input(0) | Trans(0)
		this.#bytes.push(...this.#gce(delay));
		// Image Descriptor (Full Canvas)
		this.#bytes.push(
				0x2C,
				0, 0, 0, 0, // x=0, y=0
				...u16le(this.#w), // w
				...u16le(this.#h), // h
				0x00, // Packed fields
				0x04 // LZW Min Code Size (4 bits)
		);
		// Image Data
		for(let i=0;i<lzwData.length;i+=255){
				const c=lzwData.subarray(i,i+255);
				this.#bytes.push(c.length,...c);
		}
		this.#bytes.push(0);
	}

	#lsd(){
		// Packed: GCT(1) | Res(111) | Sort(0) | Size(0011=16col) -> 0xF3
		return[...u16le(this.#w),...u16le(this.#h),0xF3,this.#bg,0];
	}

	#gct(){
		const t=new Uint8Array(48);
		t.set(this.#pal.subarray(0,48));
		return[...t];
	}

	#appext(){return[33,255,11,...("NETSCAPE2.0".split("").map(c=>c.charCodeAt(0))),3,1,0,0,0];}

	#gce(d:number){return[33,249,4,0,...u16le(d),0,0];}

	#compress(data:Uint8Array){
		const out:number[]=[];
		let clearCode=16,eoiCode=17,nextCode=18,curCodeSize=5;
		const dict=new Map<string,number>();

		const initDict=()=>{
				dict.clear();
				for(let i=0;i<16;i++)dict.set(String(i),i);
				nextCode=18;curCodeSize=5;
		};
		initDict();

		let buf=0,bits=0;
		const emit=(c:number)=>{
				buf|=c<<bits;
				bits+=curCodeSize;
				while(bits>=8){
						out.push(buf&255);
						buf>>=8;
						bits-=8;
				}
		};

		emit(clearCode);
		let prefix=String(data[0]);

		for(let i=1;i<data.length;i++){
				const c=data[i];
				const key=prefix+","+c;
				if(dict.has(key)){
						prefix=key;
				}else{
						emit(dict.get(prefix)!);
						if(nextCode===4096){
								emit(clearCode);
								initDict();
								prefix=String(c);
						}else{
								dict.set(key,nextCode);
								if(nextCode===(1<<curCodeSize)) curCodeSize++;
								nextCode++;
								prefix=String(c);
						}
				}
		}
		emit(dict.get(prefix)!);
		emit(eoiCode);
		if(bits>0)out.push(buf&255);
		return new Uint8Array(out);
	}
}


class GIF16Playfield{
	#w:number;#h:number;#px:number;#py:number;#cw:number;#ch:number;#bg:number;
	#pal:Uint8Array;#frame:Uint8Array;#bytes:number[]=[];

	constructor(
		width=320,height=200,
		palette=new Uint8Array(c64_rgb),
		borderIndex=0,
		canvasW=404,
		canvasH=284,
		playfieldX=32,
		playfieldY=51
	){
		this.#w=width;this.#h=height;
		this.#px=playfieldX;this.#py=playfieldY;
		this.#cw=canvasW;this.#ch=canvasH;
		this.#bg=borderIndex&15;
		this.#pal=palette;
		this.#frame=new Uint8Array(width*height);
		this.#bytes.push(...header,...this.#lsd(),...this.#gct(),...this.#appext());
	}

	setPixel(x:number,y:number,c:number){
		if(x>=0&&x<this.#w&&y>=0&&y<this.#h) this.#frame[y*this.#w+x]=c&15;
	}

	setBorder(c:number){
		this.#bg=c&15;
	}

	addBlank(delay=20) {
		const fullFrame = new Uint8Array(this.#cw * this.#ch);
		fullFrame.fill(this.#bg);
		this.#writeFrameBuffer(fullFrame, delay);
	}

	addFrame(delay=20){
		const fullFrame = new Uint8Array(this.#cw * this.#ch);
		fullFrame.fill(this.#bg);
		for(let y=0; y<this.#h; y++){
			const srcStart = y * this.#w;
			const dstStart = (this.#py + y) * this.#cw + this.#px;
			fullFrame.set(this.#frame.subarray(srcStart, srcStart + this.#w), dstStart);
		}
		this.#writeFrameBuffer(fullFrame, delay);
	}

	finish(){this.#bytes.push(0x3B);return new Uint8Array(this.#bytes);}

	#writeFrameBuffer(buffer: Uint8Array, delay: number) {
		const lzwData = this.#compress(buffer);
		// GCE: Reserved(000) | Disposal(000=Unspecified) | Input(0) | Trans(0)
		this.#bytes.push(...this.#gce(delay));
		// Image Descriptor (Full Canvas)
		this.#bytes.push(
				0x2C,
				0, 0, 0, 0, // x=0, y=0
				...u16le(this.#cw), // w
				...u16le(this.#ch), // h
				0x00, // Packed fields
				0x04 // LZW Min Code Size (4 bits)
		);
		// Image Data
		for(let i=0;i<lzwData.length;i+=255){
				const c=lzwData.subarray(i,i+255);
				this.#bytes.push(c.length,...c);
		}
		this.#bytes.push(0);
	}

	#lsd(){
		// Packed: GCT(1) | Res(111) | Sort(0) | Size(0011=16col) -> 0xF3
		return[...u16le(this.#w),...u16le(this.#h),0xF3,this.#bg,0];
	}

	#gct(){
		const t=new Uint8Array(48);
		t.set(this.#pal.subarray(0,48));
		return[...t];
	}

	#appext(){return[33,255,11,...("NETSCAPE2.0".split("").map(c=>c.charCodeAt(0))),3,1,0,0,0];}

	#gce(d:number){return[33,249,4,0,...u16le(d),0,0];}

	#compress(data:Uint8Array){
		const out:number[]=[];
		let clearCode=16,eoiCode=17,nextCode=18,curCodeSize=5;
		const dict=new Map<string,number>();

		const initDict=()=>{
				dict.clear();
				for(let i=0;i<16;i++)dict.set(String(i),i);
				nextCode=18;curCodeSize=5;
		};
		initDict();

		let buf=0,bits=0;
		const emit=(c:number)=>{
				buf|=c<<bits;
				bits+=curCodeSize;
				while(bits>=8){
						out.push(buf&255);
						buf>>=8;
						bits-=8;
				}
		};

		emit(clearCode);
		let prefix=String(data[0]);

		for(let i=1;i<data.length;i++){
				const c=data[i];
				const key=prefix+","+c;
				if(dict.has(key)){
						prefix=key;
				}else{
						emit(dict.get(prefix)!);
						if(nextCode===4096){
								emit(clearCode);
								initDict();
								prefix=String(c);
						}else{
								dict.set(key,nextCode);
								if(nextCode===(1<<curCodeSize)) curCodeSize++;
								nextCode++;
								prefix=String(c);
						}
				}
		}
		emit(dict.get(prefix)!);
		emit(eoiCode);
		if(bits>0)out.push(buf&255);
		return new Uint8Array(out);
	}
}

// demo
if(import.meta.main){
	const gif=new GIF16();
	gif.setBorder(6); // Blue
	gif.addBlank();
	for(let f=0;f<32;f++){
		for(let y=0;y<200;y++){
			for(let x=0;x<320;x++){
				if(Math.random()>0.8)
					gif.setPixel(x,y,(x>>4^f)&15);
			}
		}
		gif.addFrame();
	}
	await Deno.writeFile("output/test14.gif",gif.finish());
	console.log("done");
}
