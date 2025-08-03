// MIPS R3000 worker
// by simon and grok and deepseek and kimik2
// free to good home

import { mipsRegs, R3000 } from "./slopmips.js";
import { rgbShade, greyShade, ansiFG } from "./sloputil.js";

// reset signal with blank line from slopshop host

// ======================================================
// TODO:
//
// more opcodes
// more dashboard
// assembler tool
// monitor tools
// SIO com port
// GPU graphics port
// ======================================================

const MaxFrame=24000;

// ======================================================
// MIPS R3000 SIMULATION AHEAD
// ======================================================

const REG_RA=31;

const REG_HI=32;
const REG_LO=33;

const RamSize=128 * 1024 * 1024; // 128M

const RegCount=34;
const RegBanks=2;		// [values, snapshot]

let PC=0;
let PC2;
let delaySlot=false;

// TODO: spec sweet spot for an r3000 worker

const AR=0x1F000000;

const PCMASK=0x7FFFFC;
let cycleCount=0;

const CP0_SR=12; // Status register
const CP0_CAUSE=13; // Cause register
const CP0_EPC=14; // Exception PC

const EXC_VECTOR=0x80000080;
const EXC_OVF=12;

const regs=new Uint32Array(RegCount*RegBanks);
const ram=new Uint32Array(RamSize);
const cp0=new Uint32Array(32);

// ======================================================
// GPU
// ======================================================

const GPU=0x1F801800;

// ======================================================
// SIO - 8K transmit buffer
// ======================================================

const IO_MASK=0xffffffc0;
const SIO=0x1F801040;

const SIO_DATA=SIO+0;
const SIO_STATUS=SIO+4;

const sio_tx=new Uint8Array(8192);
const SIO_TX_MASK=8191;
let sio_status=0;
let tx_write=0;
let tx_read=0;

function writeSIO(val8){
	sio_tx[tx_write]=val8;
	tx_write=(tx_write+1)&SIO_TX_MASK;
	console.log("[SIO] write",val8)
}

function writeSIOStatus(val16){
	sio_status=val16;
	tx_write=(tx_write+1)&SIO_TX_MASK;
	console.log("[SIO] write",val8)
}

function readSIOData(){
	return 0;
}

function readSIOStatus(){
	return 0;
}

// ===============================================
// TRAP and MMU
// ===============================================

function handleTrap(causeCode) {
	cp0[CP0_EPC]=PC;
	cp0[CP0_CAUSE]=causeCode << 2;
	PC=EXC_VECTOR;
	cp0[CP0_SR] |= 0x1; // Set interrupt disable or kernel mode
	console.log(`Trap: Cause ${cp0[CP0_CAUSE]}, EPC ${cp0[CP0_EPC]}, New PC ${PC}`);
	return true;
}

function read(idx){
	if((idx&IO_MASK)==SIO){
		switch(idx&0x1c){
			case 0x00:
				return readSIOData();
				break;
			case 0x04:
				return readSIOStatus();
				break;
		}
		return;
	}
	return ram[idx];

}

function write(idx,val32){
	if((idx&IO_MASK)==SIO){
		switch(idx&0x1c){
			case 0x00:
				writeSIOData(val32&0xff);
				break;
			case 0x04:
				writeSIOStatus(val32&0xffff);
				break;
		}
		return;
	}
	ram[idx]=val32;
}

// ===============================================
// 64 r-type opcodes work in progress
// check the JR opcode is correct...
// ===============================================

function rtypeOp(func6, sham5, rs, rt, rd) {
	switch (func6) {
		case 0x00: // SLL
			regs[rd]=regs[rt] << sham5;
			break;
		case 0x03: // SRA (arithmetic right shift)
			regs[rd]=regs[rt] >> sham5;
			break;
		case 0x04: // SLLV
			regs[rd]=regs[rt] << (regs[rs] & 0x1F);
			break;
		case 0x06: // SRLV
			regs[rd]=regs[rt] >>> (regs[rs] & 0x1F);
			break;
		case 0x07: // SRAV
			regs[rd]=regs[rt] >> (regs[rs] & 0x1F);
			break;
		case 0x08: // JR
			PC2=(regs[rs]-4)&PCMASK;
			delaySlot=true;
			break;
		case 0x09: // JALR
			regs[rd]=PC + 8; // Store return address
			PC2=(regs[rs] - 4) & PCMASK;
			delaySlot=true;
			break;
		case 0x10: // MFHI
			regs[rd]=regs[32];
			break;
		case 0x12: // MFLO
			regs[rd]=regs[33];
			break;
		case 0x11: // MTHI
			regs[32]=regs[rs];
			break;
		case 0x13: // MTLO
			regs[33]=regs[rs];
			break;
		case 0x18: // MULT (signed)
			cycleCount+=10;
			const a=BigInt(regs[rs] | 0);
			const b=BigInt(regs[rt] | 0);
			const result=a * b;
			regs[REG_HI]=Number((result >> 32n) & 0xFFFFFFFFn) | 0;
			regs[REG_LO]=Number(result & 0xFFFFFFFFn) | 0;
			break;

		case 0x1A: // DIV (signed)
			cycleCount += 35;
			if (regs[rt]===0) {
				// Undefined behavior on divide-by-zero
				regs[REG_LO]=0;
				regs[REG_HI]=0;
			} else {
				const a=regs[rs] | 0;
				const b=regs[rt] | 0;
				regs[REG_LO]=(a / b) | 0;
				regs[REG_HI]=(a % b) | 0;
			}
			break;
		case 0x1B: // DIVU (unsigned)
			cycleCount += 35;
			if (regs[rt]===0) {
				// Undefined behavior on divide-by-zero
				regs[REG_LO]=0;
				regs[REG_HI]=0;
			} else {
				const a=regs[rs] >>> 0;
				const b=regs[rt] >>> 0;
				regs[REG_LO]=(a / b) | 0;
				regs[REG_HI]=(a % b) | 0;
			}
			break;

		case 0x20:	// 0x20	F_ADD
			const addResult=regs[rs] + regs[rt];
			if (addResult > 0x7FFFFFFF || addResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd]=addResult;
			}
			break;
		case 0x22: // 0x22 F_SUB
			const subResult=regs[rs] - regs[rt];
			if (subResult > 0x7FFFFFFF || subResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd]=subResult;
			}
			break;
		case 0x23: // SUBU (unsigned, no overflow)
			regs[rd]=regs[rs] - regs[rt];
			break;
		case 0x24: // AND
			regs[rd]=regs[rs] & regs[rt];
			break;
		case 0x25: // OR
			regs[rd]=regs[rs] | regs[rt];
			break;
		case 0x27: // NOR
			regs[rd]=~(regs[rs] | regs[rt]);
			break;
		case 0x2A: // SLT (signed compare)
			regs[rd]=(regs[rs] | 0) < (regs[rt] | 0) ? 1 : 0;
			break;
		case 0x2B: // SLTU (unsigned compare)
			regs[rd]=regs[rs] >>> 0 < regs[rt] >>> 0 ? 1 : 0;
			break;
		default:
			console.log("unsupported func6",hex(func6));
		}
	return true;
}

// ======================================================
// decodeMIPS updates global cycleCount PC PC2 delaySlot
// ======================================================


function decodeMIPS(i32) {
	cycleCount++;
	const op6=(i32 >> 26) & 0x3f;
	const rs=(i32 >> 21) & 0x1f;
	const rt=(i32 >> 16) & 0x1f;
	const rd=(i32 >> 11) & 0x1f;

	if(op6==0){
		const func6=i32 & 0x3f;
		const sham5=(i32 >> 6) & 0x1f;
		return rtypeOp(func6, sham5, rs, rt, rd);
	}

	const offset=(i32<<16)>>16;
	const ea=(regs[rs]+offset);
	const idx=ea>>2;
	const byteShift=24-((ea&3)<<3);
	const halfShift=16-((ea&3)<<4);	// ea&2 ?

	switch (op6) {
		case 0x01: // BLTZ BGEZ BLTZAL BGEZAL
			const cond =(i32 >> 16) & 0x1f; // condition bits
			const link1=(cond & 1) !== 0;     // bit0 set → “and-link”
			const test=regs[rs] | 0;       // signed compare
			const take=((rt >> 4) & 1)===0
				? test < 0  // bit4 low → “LTZ”
				: test >= 0; // bit4 high → “GEZ”
			if (link1) regs[31]=PC + 8;     // delay of caller
			if (take) {
				PC2=PC+(offset<<2);
				delaySlot=true;
			}
			break;
		case 0x02: // J
		case 0x03: // JAL
			const link=(op6==0x03);
			const addr26=i32&0x03FFFFFF;
			const target=(PC+4&0xF0000000)|(addr26<<2);
			if (link) regs[31]=PC+8; // JAL stores return‐address
			PC2=target - 4; // subtract 4 so tickTest adds it back
			delaySlot=true;
			break;
		case 0x04: // BEQ
			if (regs[rs]===regs[rt]) {
	//			console.log("BEQ",offset<<2);
				PC2=PC+(offset<<2);
				delaySlot=true;
			}
			break;
		case 0x05: // BNE
			if (regs[rs] !== regs[rt]) {
				PC2=PC+(offset<<2);
				delaySlot=true;
			}
			break;
		case 0x06: // BLEZ
			if ((regs[rs] | 0) <= 0) {
				PC2=PC+(offset<<2);
				delaySlot=true;
			}
			break;
		case 0x07: // BGTZ
			if ((regs[rs] | 0) > 0) {
				PC2=PC+(offset<<2);
				delaySlot=true;
			}
			break;
		case 0x08:	// ADDI
			const addiResult=regs[rs] + offset;
			if (addiResult > 0x7FFFFFFF || addiResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rt]=addiResult;
			}
			break;
		case 0x09:          // ADDIU – add immediate unsigned
			regs[rt]=regs[rs]+offset;
			break;
		case 0x0A: // SLTI
			regs[rt]=(regs[rs] | 0) < (offset | 0) ? 1 : 0;
			break;
		case 0x0B: // SLTIU
			regs[rt]=(regs[rs] >>> 0) < (offset >>> 0) ? 1 : 0;
			break;
		case 0x0C: // ANDI
			regs[rt]=regs[rs] & (offset & 0xFFFF);
			break;
		case 0x0D: // ORI
			regs[rt]=regs[rs] | (offset & 0xFFFF);
			break;
		case 0x0E: // XORI
			regs[rt]=regs[rs] ^ (offset & 0xFFFF);
			break;
		case 0x0F: // LUI
			regs[rt]=offset << 16;
			break;
		case 0x10:
		case 0x11:
		case 0x12:
		case 0x13:
			// coprocessor 0-3 unimplemented
			break;
		case 0x14:
		case 0x15:
		case 0x16:
		case 0x17:
			// reserved (left space for coprocs)
			break;
		case 0x18:
		case 0x19:
		case 0x1A:
		case 0x1B:
		case 0x1C:
		case 0x1D:
		case 0x1E:
		case 0x1F:
			// unused major opcodes 24-31
			break;

		case 0x20: // LB
			cycleCount+=2;
			regs[rt]=(((ram[idx] >>> byteShift)& 0xFF) << 24) >> 24;
			break;
		case 0x21: // LH
			cycleCount+=2;
			if (ea & 1) return handleTrap(5);
			regs[rt]=(((ram[idx] >>> halfShift) & 0xFFFF) << 16) >> 16;
			break;
		case 0x22: // LWL	load word left
			cycleCount+=3;
			const bits=(ea&3)<<3;
			const mask=(-1>>>(32-bits));
			regs[rt]=(ram[idx]<<bits) | (regs[rt]&mask);
			break;
		case 0x23:	// LW
			cycleCount+=2;
			regs[rt]=ram[idx];
			break;
		case 0x24: // LBU
			cycleCount+=2;
			regs[rt]=(ram[idx] >>> byteShift) & 0xFF;
			break;
		case 0x25: // LHU
			cycleCount+=2;
			if (ea & 1) return handleTrap(5);
			regs[rt]=(ram[idx] >>> halfShift) & 0xFFFF;
			break;
		case 0x26: // LWR - Load Word Right
			cycleCount += 3;
			const bits2=(3 - (ea & 3)) << 3; // Opposite of LWL
			const mask2=(-1 << bits2) >>> 0; // Mask for preserving left bits
			regs[rt]=(ram[idx] >>> bits2) | (regs[rt] & mask2);
			break;
		case 0x28: // SB
			cycleCount+=2;
			const sb=(ram[idx] & ~(0xFF << byteShift)) | ((regs[rt] & 0xFF) << byteShift);
			write(idx,sb);
			break;
		case 0x29: // SH
			cycleCount+=2;
			if (ea & 1) return handleTrap(5);
			const sh=(ram[idx]&~(0xFFFF<<halfShift)) | ((regs[rt] & 0xFFFF)<<halfShift);
			write(idx,sh);
			break;

		case 0x2A: // SWL - Store Word Left
			cycleCount += 3;
			const swlBits=(ea & 3) << 3;
			const swlMask=(-1 >>> (32 - swlBits)) >>> 0;
			const swl=(ram[idx] & ~swlMask) | ((regs[rt] >>> (24 - swlBits)) & swlMask);
			write(idx,swl);
			break;

		case 0x2B: // SW
			cycleCount+=2;
			write(idx,regs[rt]);
			break;

		case 0x2E: // SWR - Store Word Right
			cycleCount += 3;
			const swrBits=(3 - (ea & 3)) << 3;
			const swrMask=(-1 << swrBits) >>> 0;
			ram[idx]=(ram[idx] & ~swrMask) | ((regs[rt] << swrBits) & swrMask);
			break;

		default:
			console.log("unsupported op6",hex(op6));
	}
	return true;
}


// borrowed from sloputil

const BrailleCode=0x2800;

function hex(i32){
	return regBits(i32);
}
function hex2(i32){
	return i32.toString(16).padStart(8, '0');
}
function regBits(i32){
	const line=[];
	for(let byte=0;byte<4;byte++){
		const shift=(3-byte)*8;
		const bits=(i32>>shift)&255;
		const u=BrailleCode+bits;
		line.push(String.fromCharCode(u));
	}
	return line.join("");
}

// register contents 32 * 4 x 8 braille bits chars

function frontPanel2(){
//	return "hello world";
	const bank=[];
	const fg0=ansiFG(7);
	const fg1=ansiFG(greyShade(13/23.0));
	const fg2=ansiFG(rgbShade(1/5.0,1,1));
	for(let i=0;i<32;i++){
		const i32=i>0?regs[i]:PC;
		const fg3=regs[i+RegCount]==regs[i]?fg1:fg2;
		bank.push(fg3+regBits(i32)+fg0+"│");
		if((i&7)==7) bank.push("\n");
	}
	const line=bank.join("");
	return line;
}

class panel{
	constructor(){}
}

// register state
function logLines(lines,count){
	const w=40;
	if(tickLog){//&&tickLog.length>2){
		const n=tickLog.length-1;
		for(let i=0;i<count;i++){
			lines.push((tickLog[n-i]||"").padEnd(w," ")+"\n");
		}
	}
}

function frontPanel(){
	const sticker="⛲R3000"
//	return "hello world";
	const bank=[];
	const fg0=ansiFG(7);
	const fg1=ansiFG(greyShade(13/23.0));
	const fg2=ansiFG(rgbShade(1/5.0,1,1));
	for(let i=0;i<32;i++){
		if((i&7)==0) bank.push("│");
		const i32=i>0?regs[i]:PC;
		const fg3=regs[i+RegCount]==regs[i]?fg1:fg2;
		bank.push(fg3+regBits(i32)+fg0+"│");
		if((i&7)==7) bank.push("\n");
	}
	const regbank=bank.join("");
	const lines=[regbank];
	logLines(lines,5);
	lines.push(sticker+"♻️:"+cycleCount.toString(16)+" 📟:"+PC.toString(16))
	return lines.join("");
}


const AsmWidth=24+10;
const r3000=new R3000();

const MaxCycles=10;

function startTest(loc=0) {
	PC=loc;
}

function stepTest(loc=0) {
	if(PC<0) return false;
	regs.copyWithin(RegCount,0,RegCount);
	if (delaySlot) {
		const word=(PC&PCMASK)>>2;
		const i32=ram[word];
		if(!decodeMIPS(i32)) return false;
		PC=PC2 & PCMASK;
		delaySlot=false;
	}else{
		const word=(PC&PCMASK)>>2;
		const i32=ram[word];
		if(!decodeMIPS(i32)) return false;
	}
	PC+=4;
}

function TestROM0(){
// Test program: ADDI, ADD, SUB, SLL, JR, LW
	ram[0]=0x20080005; // ADDI $t0, $zero, 5  (t0=5)
	ram[1]=0x00000000; // NOP
	ram[2]=0x2009000A; // ADDI $t1, $zero, 10 (t1=10)
	ram[3]=0x01095020; // ADD $t2, $t0, $t1   (t2=15)
	ram[4]=0x01095822; // SUB $t3, $t0, $t1   (t3=-5)
	ram[5]=0x000a5080; // SLL $t2, $t2, 2     (t2=15 << 2=60)
	ram[6]=0x8D040000; // LW $t4, 0($t0)      (t4=ram[t0>>2])
	ram[7]=0x012A402A; // SLT $t0, $t1, $t2
	ram[8]=0x01094027; // NOR $t0, $t0, $t1
	ram[9]=0x01090018; // MULT $t0, $t1
	ram[10]=0x00000810; // MFHI $t0
	ram[11]=0x00000812; // MFLO $t0
	ram[12]=0x00000008; // JR $zero            (jump to 0, halt)
// ORG 0x0080
	ram[32]=0x21080001; // ADDI $t0, $t0, 1
	ram[33]=0x1108fffe; // BEQ $t0, $t0, -8 (always branch back 2 words)
	ram[34]=0; //nop
}

// toggles on reset betwen org 0 and org 0x80
let startVector=0;

function onResize(size){
}
function onReset(){
	startTest(startVector);
	startVector=0x80-startVector;
}

function onCPUTick(){
	if(true){
		const loc=(PC)&PCMASK;
		const op=ram[loc>>2];
		const status=r3000.disassemble(op,loc);
		tickLog.push(status);
//		console.log(status);
	}
	stepTest();
}

function tick() {
	tickCount++;
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	if(!stopped) onCPUTick();
	const frame=(count>=0 && count<MaxFrame)?frontPanel():"";
	return {success:true,event:"tick",count,frame};
}

function update(events){
	for(const e of events){
		if(e.name=="refresh"){
			refreshTick=e.code[0];
			const reply=tick();
			self.postMessage(reply);
		}
	}
}

const tickLog=[];

let refreshTick=0;
let tickCount=0;
let frameCount=-1;

// ======================================================
// parseElf
// ======================================================

// ELF constants

const ELF_MAGIC=0x464C457F; // "\x7FELF"
const ELF_CLASS32=1;
const ELF_DATA2LSB=1;
const ELF_EM_MIPS=8;

function dumpBin(bin){
	const len=bin.length;
	let bytes=[];
	for(let i=0;i<len;i++){
		const b=bin[i];
		bytes.push(b.toString(16).padStart(2,"0"));
		if((i&63)==63 || i==(len-1)){
			const line=bytes.join(" ");
			console.log(line);
			bytes.length=0;
		}
	}

}

function parseElf(elfData) {
	const view=new DataView(elfData.buffer);
// Verify ELF header
	if (view.getUint32(0, true) !== ELF_MAGIC) {
		console.error("Invalid ELF magic");
		return false;
	}
	const cpuclass=view.getUint8(4); 
	const lsb=view.getUint8(5);
	const fam=view.getUint16(18, true);
	console.log("parseElf",{cpuclass,lsb,fam});
	if (cpuclass !== ELF_CLASS32 || lsb !== ELF_DATA2LSB || fam !== ELF_EM_MIPS) {
		console.error("Unsupported ELF format (not 32-bit, little-endian MIPS)");
		return false;
	}
	// Read ELF header fields
	const e_entry=view.getUint32(24, true); // Entry point address
	const e_phoff=view.getUint32(28, true); // Program header offset
	const e_phnum=view.getUint16(44, true); // Number of program headers
	const e_phentsize=view.getUint16(42, true); // Size of each program header
	// Load program segments
	for (let i=0; i < e_phnum; i++) {
		const phoff=e_phoff + i * e_phentsize;
		const p_type=view.getUint32(phoff, true);
		const p_offset=view.getUint32(phoff + 4, true);
		const p_vaddr=view.getUint32(phoff + 8, true);
		const p_filesz=view.getUint32(phoff + 16, true);
		const p_memsz=view.getUint32(phoff + 20, true);

		const vaddr24=p_vaddr&PCMASK;

		// Only load PT_LOAD segments (type 1)
		if (p_type===1) {
			// Ensure address is within ram bounds
			if (vaddr24 + p_memsz > RamSize) {
				console.error(`Segment at 0x${p_vaddr.toString(16)} exceeds RAM size`);
				return false;
			}

			// Copy segment data to ram
			const ramIdx=vaddr24 >> 2; // Word-aligned index
			for (let j=0; j < p_filesz; j += 4) {
				const val=view.getUint32(p_offset + j, true);
				ram[ramIdx + (j >> 2)]=val;
				const loc=vaddr24+j;
				const op=val;				
				console.log(r3000.disassemble(op,loc));
			}

			// Zero-fill any remaining memory (if p_memsz > p_filesz, e.g., for .bss)
			for (let j=p_filesz; j < p_memsz; j += 4) {
				ram[ramIdx + (j >> 2)]=0;
			}
	
			console.log(`Loaded segment: vaddr=0x${p_vaddr.toString(16)}, size=0x${p_filesz.toString(16)}`);
		}
	}

}




// --allow-read

console.log("test6 homegrown mips r3000 emulator");

const elf=await Deno.readFile("../slop/test2.elf");

//dumpBin(elf);

parseElf(elf);


self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			tickLog.length=0;
			const size=slip.consoleSize;
			if(size) onResize(size);
			onReset();
			break;
		case "update":
			const events=slip.events;
			update(events);
			break;
		case "stop":
			frameCount=-1;
			break;
	}
};

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
