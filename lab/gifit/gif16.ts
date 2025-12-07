// gif16.ts - a gif89A 50Hz stream of C64 color (16) charmap (40x25) pixels (320 x 200)
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

// c64 char map
const c64_charset="@ABCDEFGHIJKLMNOPQRSTUVWXYZ[$]↑← \"!#$%&’()*+,-./0123456789:;<=>?";

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

const c64_chars = [
	//  0.. @ABCDEFGHIJKLMNOPQRSTUVWXYZ[$]↑←
	"3c666e6e60623c00","183c667e66666600","7c66667c66667c00","3c66606060663c00",
	"786c6666666c7800","7e60607860607e00","7e60607860606000","3c66606e66663c00",
	"6666667e66666600","3c18181818183c00","1e0c0c0c0c6c3800","666c7870786c6600",
	"6060606060607e00","63777f6b63636300","66767e7e6e666600","3c66666666663c00",
	"7c66667c60606000","3c666666663c0e00","7c66667c786c6600","3c66603c06663c00",
	"7e18181818181800","6666666666663c00","66666666663c1800","6363636b7f776300",
	"66663c183c666600","6666663c18181800","7e060c1830607e00","3c30303030303c00",
	"0c12307c3062fc00","3c0c0c0c0c0c3c00","00183c7e18181818","0010307f7f301000",
	// 32.. !"#$%&’()*+,-./0123456789:;<=>?
	"0000000000000000","1818181800001800","6666660000000000","6666ff66ff666600",
	"183e603c067c1800","62660c1830664600","3c663c3867663f00","060c180000000000",
	"0c18303030180c00","30180c0c0c183000","00663cff3c660000","0018187e18180000",
	"0000000000181830","0000007e00000000","0000000000181800","0003060c18306000",
	"3c666e7666663c00","1818381818187e00","3c66060c30607e00","3c66061c06663c00",
	"060e1e667f060600","7e607c0606663c00","3c66607c66663c00","7e660c1818181800",
	"3c66663c66663c00","3c66663e06663c00","0000180000180000","0000180000181830",
	"0e18306030180e00","00007e007e000000","70180c060c187000","3c66060c18001800",
	// 64
	"000000ffff000000","081c3e7f7f1c3e00","1818181818181818","000000ffff000000",
	"0000ffff00000000","00ffff0000000000","00000000ffff0000","3030303030303030",
	"0c0c0c0c0c0c0c0c","000000e0f0381818","18181c0f07000000","181838f0e0000000",
	"c0c0c0c0c0c0ffff","c0e070381c0e0703","03070e1c3870e0c0","ffffc0c0c0c0c0c0",
	"ffff030303030303","003c7e7e7e7e3c00","0000000000ffff00","367f7f7f3e1c0800",
	"6060606060606060","000000070f1c1818","c3e77e3c3c7ee7c3","003c7e66667e3c00",
	"1818666618183c00","0606060606060606","081c3e7f3e1c0800","181818ffff181818",
	"c0c03030c0c03030","1818181818181818","0000033e76363600","ff7f3f1f0f070301",
	// 96
	"0000000000000000","f0f0f0f0f0f0f0f0","00000000ffffffff","ff00000000000000",
	"00000000000000ff","c0c0c0c0c0c0c0c0","cccc3333cccc3333","0303030303030303",
	"00000000cccc3333","fffefcf8f0e0c080","0303030303030303","1818181f1f181818",
	"000000000f0f0f0f","1818181f1f000000","000000f8f8181818","000000000000ffff",
	"0000001f1f181818","181818ffff000000","000000ffff181818","181818f8f8181818",
	"c0c0c0c0c0c0c0c0","e0e0e0e0e0e0e0e0","0707070707070707","ffff000000000000",
	"ffffff0000000000","0000000000ffffff","030303030303ffff","00000000f0f0f0f0",
	"0f0f0f0f00000000","181818f8f8000000","f0f0f0f000000000","f0f0f0f00f0f0f0f"]

const u16le=(n:number):number[]=>[n&255,n>>8&255];
const header="GIF89a".split("").map(c=>c.charCodeAt(0));

// runs byte per pixel frame of width * height uint8

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

	cursorX=0;
	cursorY=0;

	drawString(text:string){
		for(let ch=0;ch<32;ch++){
		}
	}

	drawTest(){
		for(let i=0;i<4;i++){
			for(let ch=0;ch<32;ch++){
				this.drawChar(ch+i*32,1,ch*8,i*16);
			}
		}
	}

	drawChar(ch=0,c=1,px=0,py=0){
		const bits64:string=c64_chars[ch];
//		console.log(ch,bits64);
		for(let y=0;y<8;y++){
			let slice=bits64.slice(y*2,y*2+2)
			let bits=parseInt(slice,16);
			for(let x=0;x<8;x++){
				if(bits&(128>>x)) this.setPixel(px+x,py+y,c);
			}
		}
	}

	clear(bg:number) {
		this.#frame.fill(bg);
	}

	setPixel(x:number,y:number,c:number){
		//if(x>=0&&x<this.#w&&y>=0&&y<this.#h)
		this.#frame[y*this.#w+x]=c&15;
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

function dumpROM(name:string,bytes:Uint8Array,mod=16,base=0xe000){
	let n=bytes.length;
	for(let i=0;i<n;i+=mod){
		let slice=bytes.slice(i, i + mod);
		let a16=(base+i).toString(16);
		let hex=Array.from(slice, b => b.toString(16).padStart(2, '0')).join(' ');
		let asc=Array.from(slice, b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
		console.log(a16,hex,asc);
	}
}

const k="kernal-906145-02.bin";	//E000..FFFF
const rom = await Deno.readFile("roms/"+k);

// dumpROM(k,rom);
// await Deno.mkdir("output");

if(import.meta.main){
	const gif=new GIF16();
	gif.setBorder(6); // Blue
	gif.addBlank();
	for(let f=0;f<32;f++){
		gif.clear(14);
		gif.drawTest();
//		gif.drawString("HELLO");
		gif.addFrame();
	}
	await Deno.writeFile("output/pattern2.gif",gif.finish());
	console.log("done");
}
