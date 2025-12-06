// gif16.ts - streams gif (fixed)
// Copyright (c) 2025 Simon Armstrong
// All rights reserved
const c64_rgb = [
	0,0,0,
	255,255,255,	
	136,0,0,		
	170,255,238,
	204,68,204,	
	0,204,85,	
	0,0,170,	
	238,238,119,
	221,136,85,	
	102,68,0,	
	255,119,119,	
	51,51,51,
	119,119,119,	
	170,255,102,	
	0,136,255,	
	187,187,187
];

const u16le=(n:number):number[]=>[n&255,n>>8&255];
const header="GIF89a".split("").map(c=>c.charCodeAt(0));

class GIF16{
	#w:number;
	#h:number;
	#border:number;	
	#bg:number;
	#pal:Uint8Array;
	#frame:Uint8Array;
	#bytes:number[]=[];

	constructor(
		width=320,height=200,
		palette=new Uint8Array(c64_rgb), // Fixed palette loading
	){
		this.#w=width;
		this.#h=height;
		this.#border=14;
		this.#pal=palette;
		this.#frame=new Uint8Array(width*height);
		this.#bytes.push(...header,...this.#lsd(),...this.#gct(),...this.#appext());
	}

	setPixel(x:number,y:number,c:number){
		if(x>=0&&x<this.#w&&y>=0&&y<this.#h) this.#frame[y*this.#w+x]=c&15;
	}

	clear(bg:number) {
		const frame = this.#frame;
		frame.fill(bg);
	}	

	setBorder(c:number){
		this.#border=c&15;
	}

	addFrame(delay=4){
		// Compress frame indices directly (0-15)
		const lzwData=this.#compress(this.#frame);
		// Graphic Control Extension delay
		this.#bytes.push(...this.#gce(delay));
		// Image Descriptor
		const px=0;
		const py=0;
		this.#bytes.push(0x2C,...u16le(px),...u16le(py),...u16le(this.#w),...u16le(this.#h),0x00);
		// LZW Minimum Code Size (4 bits for 16 colors)
		this.#bytes.push(0x04);
		// Image Data Sub-blocks
		for(let i=0;i<lzwData.length;i+=255){
			const c=lzwData.subarray(i,i+255);
			this.#bytes.push(c.length,...c);
		}
		this.#bytes.push(0);
	}

	finish(){this.#bytes.push(0x3B);return new Uint8Array(this.#bytes);}

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

	#gce(d:number){return[33,249,4,4,...u16le(d),0,0];}

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

class GIF16Framed{
	#w:number;#h:number;#px:number;#py:number;#cw:number;#ch:number;#bg:number;
	#pal:Uint8Array;#frame:Uint8Array;#bytes:number[]=[];

	constructor(
		width=320,height=200,
		palette=new Uint8Array(c64_rgb), // Fixed palette loading
		borderIndex=0,
		canvasW=404,canvasH=284,
		playfieldX=32,playfieldY=51
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

	setBorder(c:number){this.#bg=c&15;}

	addBlank(delay: number = 1) {
		const fullFrame = new Uint8Array(this.#cw * this.#ch);
		fullFrame.fill(this.#bg);
		const lzwData = this.#compress(fullFrame);
		this.#bytes.push(
			...this.#gce(delay),
			0x2C,
			0, 0, 0, 0,            // Left: 0, Top: 0
			...u16le(this.#cw),    // Width: canvasW
			...u16le(this.#ch),    // Height: canvasH
			0x00,                  // Packed Fields (No LCT)
			0x04                   // LZW Minimum Code Size (4 bits for 16 colors)
		);

		for (let i = 0; i < lzwData.length; i += 255) {
			const chunk = lzwData.subarray(i, i + 255);
			this.#bytes.push(chunk.length, ...chunk);
		}
		this.#bytes.push(0);
	}	

	addFrame(delay=4){
		// Compress frame indices directly (0-15)
		const lzwData=this.#compress(this.#frame);
		// Graphic Control Extension delay
		this.#bytes.push(...this.#gce(delay));
		// Image Descriptor
		this.#bytes.push(0x2C,...u16le(this.#px),...u16le(this.#py),...u16le(this.#w),...u16le(this.#h),0x00);
		// LZW Minimum Code Size (4 bits for 16 colors)
		this.#bytes.push(0x04);
		// Image Data Sub-blocks
		for(let i=0;i<lzwData.length;i+=255){
			const c=lzwData.subarray(i,i+255);
			this.#bytes.push(c.length,...c);
		}
		this.#bytes.push(0);
	}

	finish(){this.#bytes.push(0x3B);return new Uint8Array(this.#bytes);}

	#lsd(){
		// Packed: GCT(1) | Res(111) | Sort(0) | Size(0011=16col) -> 0xF3
		return[...u16le(this.#cw),...u16le(this.#ch),0xF3,this.#bg,0];
	}

	#gct(){
		const t=new Uint8Array(48);
		t.set(this.#pal.subarray(0,48));
		return[...t];
	}

	#appext(){return[33,255,11,...("NETSCAPE2.0".split("").map(c=>c.charCodeAt(0))),3,1,0,0,0];}

	#gce(d:number){return[33,249,4,4,...u16le(d),0,0];}

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
	gif.setBorder(14);
	gif.clear(6);
//	gif.addBlank(0);
	for(let f=0;f<32;f++){
		for(let y=0;y<200;y++){
			for(let x=0;x<320;x++){
				const c4=y<20?(x>>4^f)&3:6;
				gif.setPixel(x,y,c4);	// &15
			}
		}
		gif.addFrame(6);
	}
	await Deno.writeFile("output/test10.gif",gif.finish());
	console.log("done");
}
