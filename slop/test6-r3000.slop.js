// MIPS R3000 worker
// by simon and grok and deepseek and kimik2
// free to good home

// things to do

// delayslot execution logic
// more opcodes
// vintage dashboard

import { mipsRegs, R3000 } from "./slopmips.js";
import { rgbShade, greyShade, ansiBG, ansiFG } from "./sloputil.js";


// MIPS decode
// op6 rs5 rt5 rd5 sham5 func6
// op6 rs5 rt5 imm16
// op6 address26

// count clock cycles of MIPS r3000 core under emulation

let PC = 0;
const PCMASK=0x7ffc;
let cycleCount=0;

const CP0_SR = 12; // Status register
const CP0_CAUSE = 13; // Cause register
const CP0_EPC = 14; // Exception PC

const EXC_VECTOR = 0x80000080;
const EXC_OVF = 12;

const REG_HI=32;
const REG_LO=33;

const RegCount = 34;
const RegBanks = 2;

const RamSize = 128 * 1024 * 1024; // 128M

const regs = new Uint32Array(RegCount*RegBanks);
const ram = new Uint32Array(RamSize);
const cp0 = new Uint32Array(32);

function handleTrap(causeCode) {
	cp0[CP0_EPC] = PC;
	cp0[CP0_CAUSE] = causeCode << 2;
	PC = EXC_VECTOR;
	cp0[CP0_SR] |= 0x1; // Set interrupt disable or kernel mode
	console.log(`Trap: Cause ${cp0[CP0_CAUSE]}, EPC ${cp0[CP0_EPC]}, New PC ${PC}`);
	return true;
}

// 64 r-type opcodes work in progress

function rtypeOp(func6, rs, rt, rd, sham5) {
	switch (func6) {
		case 0x00: // SLL
			regs[rd] = regs[rt] << sham5;
			break;
//		case 0x03: // SRA (arithmetic right shift)
//			regs[rd] = regs[rt] >> sham5;
//			break;
// Safer version:
		case 0x03: // SRA (arithmetic right shift)
			regs[rd] = (regs[rt] >> Math.min(sham5, 31)) |
				(regs[rt] & 0x80000000 ? ~(0x7FFFFFFF >> Math.min(sham5, 31)) : 0);
			break;
		case 0x04: // SLLV
			regs[rd] = regs[rt] << (regs[rs] & 0x1F);
			break;
		case 0x06: // SRLV
			regs[rd] = regs[rt] >>> (regs[rs] & 0x1F);
			break;
		case 0x07: // SRAV
			regs[rd] = regs[rt] >> (regs[rs] & 0x1F);
			break;
		case 0x10: // MFHI
			regs[rd] = regs[32];
			break;
		case 0x12: // MFLO
			regs[rd] = regs[33];
			break;
		case 0x11: // MTHI
			regs[32] = regs[rs];
			break;
		case 0x13: // MTLO
			regs[33] = regs[rs];
			break;
		case 0x18: // MULT (signed)
			cycleCount+=10;
			const a = BigInt(regs[rs] | 0);
			const b = BigInt(regs[rt] | 0);
			const result = a * b;
			regs[REG_HI] = Number((result >> 32n) & 0xFFFFFFFFn) | 0;
			regs[REG_LO] = Number(result & 0xFFFFFFFFn) | 0;
			break;
		case 0x20:	// 0x20	F_ADD
			const addResult = regs[rs] + regs[rt];
			if (addResult > 0x7FFFFFFF || addResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd] = addResult;
			}
			break;
		case 0x22: // 0x22 F_SUB
			const subResult = regs[rs] - regs[rt];
			if (subResult > 0x7FFFFFFF || subResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd] = subResult;
			}
			break;
		case 0x24: // F_AND: // 0x24 which AND
			regs[rd] = regs[rs] & regs[rt];
			break;
		case 0x25: // F_OR: // OR
			regs[rd] = regs[rs] | regs[rt];
			break;
		case 0x08: // F_JR: // JR
			const delaySlotPC=PC+4;
			PC=(regs[rs]-4)&PCMASK;
			// TODO: Execute delaySlotPC here if needed
			break;
		case 0x23: // SUBU (unsigned, no overflow)
			regs[rd] = regs[rs] - regs[rt];
			break;
		case 0x27: // NOR
			regs[rd] = ~(regs[rs] | regs[rt]);
			break;
		case 0x2A: // SLT (signed compare)
			regs[rd] = (regs[rs] | 0) < (regs[rt] | 0) ? 1 : 0;
			break;
		case 0x2B: // SLTU (unsigned compare)
			regs[rd] = regs[rs] >>> 0 < regs[rt] >>> 0 ? 1 : 0;
			break;
		default:
			console.log("unsupported func6",hex(func6));
		}
	return true;
}

function decodeMIPS(i32) {
	cycleCount++;
	const op6 = (i32 >> 26) & 0x3f;
	const rs = (i32 >> 21) & 0x1f;
	const rt = (i32 >> 16) & 0x1f;
	const rd = (i32 >> 11) & 0x1f;
    const offset = ((i32<<16)>>16);
	switch (op6) {
		case 0: // R-type
			const sham5 = (i32 >> 6) & 0x1f;
			const func6 = i32 & 0x3f;
			return rtypeOp(func6, rs, rt, rd, sham5);
		case 0x04: // BEQ
			if (regs[rs]===regs[rt]) {
	//			console.log("BEQ",offset<<2);
				PC+=(offset<<2);
			}
			break;
		case 0x05: // BNE
			if (regs[rs] !== regs[rt]) {
				PC+=(offset<<2);
			}
			break;
		case 0x06: // BLEZ
			if ((regs[rs] | 0) <= 0) {
				PC+=(offset<<2);
			}
			break;

		case 0x07: // BGTZ
			if ((regs[rs] | 0) > 0) {
				PC+=(offset<<2);
			}
			break;
		case 0x08:	// ADDI
			const imm = i32 & 0xffff;
			const signExtImm = (imm & 0x8000) ? (imm | 0xffff0000) : imm;
			const addiResult = regs[rs] + signExtImm;
			if (addiResult > 0x7FFFFFFF || addiResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rt] = addiResult;
			}
			break;
		case 0x20: // LB
			cycleCount+=2;
			regs[rt] = ((w >>> (24 - (al << 3))) & 0xFF) << 24 >> 24;
			break;
		case 0x21: // LH
			if (al & 1) return handleTrap(5);               // address error
			cycleCount+=2;
			regs[rt] = ((w >>> (16 - (al << 4))) & 0xFFFF) << 16 >> 16;
			break;
		case 0x23:	// LW
			cycleCount+=2;
			const imm_lw = i32 & 0xffff;
			const signExtImm_lw = (imm_lw & 0x8000) ? (imm_lw | 0xffff0000) : imm_lw;
			const addr = (regs[rs] + signExtImm_lw) >> 2;
			regs[rt] = ram[addr];
			break;
		case 0x24: // LBU
			cycleCount+=2;
			regs[rt] = (w >>> (24 - (al << 3))) & 0xFF;
			break;
		case 0x25: // LHU
			if (al & 1) return handleTrap(5);
			cycleCount+=2;
			regs[rt] = (w >>> (16 - (al << 4))) & 0xFFFF;
			break;
		case 0x28: // SB
			cycleCount+=2;
			ram[idx] = (w & ~(0xFF << (24 - (al << 3)))) |
					((regs[rt] & 0xFF) << (24 - (al << 3)));
			break;
		case 0x29: // SH
			if (al & 1) return handleTrap(5);
			cycleCount+=2;
			ram[idx] = (w & ~(0xFFFF << (16 - (al << 4)))) |
					((regs[rt] & 0xFFFF) << (16 - (al << 4)));
			break;
		case 0x2B: // SW
			cycleCount+=2;
			ram[idx] = regs[rt];
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

function colors(){
	const list=[];
	for(let i=0;i<6;i++){
		for(let j=0;j<6;j++){
			for(let k=0;k<6;k++){
				const rgb=rgbShade(i/5.0,j/5.0,k/5.0);
				list.push(ansiBG(rgb)+" ");
			}
		}
		list.push(ansiBG(0)+"\n");
	}
	console.log(list.join(""));
}

const AsmWidth=24+10;
const r3000=new R3000();

const MaxCycles = 20;

function runTest(loc=0) {
	PC=loc;
//	ram[1] = 4; // Store value 4 at ram[1] for LW test
	const pcregs=["PC"].concat(mipsRegs.slice(1));
	const regnames=pcregs.join("   ");
	console.log("".padStart(AsmWidth+3)+regnames);
	for (let i = 0; i < MaxCycles; i++) {
		if(PC<0){
			break;
		}
		regs.copyWithin(RegCount,0,RegCount);


		const word=(PC&PCMASK)>>2;
		const i32=ram[word];
		const asm=r3000.disassemble(i32,PC);

		if (!decodeMIPS(i32)) break;
		PC+=4;

		// in dump land PC is reg0
		const bank=[];
		const bg0=ansiBG(0);
		const bg1=ansiBG(greyShade(1/23.0));
		const bg2=ansiBG(1);
		for(let i=0;i<32;i++){
			const i32=i>0?regs[i]:PC;
			const bg3=regs[i+RegCount]==regs[i]?bg1:bg2;
			bank.push(bg3+regBits(i32)+bg0);
		}
		const line=bank.join(" ");

		console.log(asm.padEnd(AsmWidth)+" "+line);
	}
}

// Test program: ADDI, ADD, SUB, SLL, JR, LW
ram[0] = 0x20080005; // ADDI $t0, $zero, 5  (t0 = 5)
ram[1] = 0x00000000; // NOP
ram[2] = 0x2009000A; // ADDI $t1, $zero, 10 (t1 = 10)
ram[3] = 0x01095020; // ADD $t2, $t0, $t1   (t2 = 15)
ram[4] = 0x01095822; // SUB $t3, $t0, $t1   (t3 = -5)
ram[5] = 0x000a5080; // SLL $t2, $t2, 2     (t2 = 15 << 2 = 60)
ram[6] = 0x8D040000; // LW $t4, 0($t0)      (t4 = ram[t0>>2])
ram[7] = 0x012A402A; // SLT $t0, $t1, $t2
ram[8] = 0x01094027; // NOR $t0, $t0, $t1
ram[9] = 0x01090018; // MULT $t0, $t1
ram[10] = 0x00000810; // MFHI $t0
ram[11] = 0x00000812; // MFLO $t0
ram[12] = 0x00000008; // JR $zero            (jump to 0, halt)

// ORG 0x0080
ram[32] = 0x21080001; // ADDI $t0, $t0, 1
ram[33] = 0x1108fffe; // BEQ $t0, $t0, -8 (always branch back 2 words)
ram[34] = 0; //nop

console.log("test6 homegrown mips r3000 emulator");

//runTest(0x0080);	//cycle t0
runTest(0x00);	// validate instruction behavior

colors();