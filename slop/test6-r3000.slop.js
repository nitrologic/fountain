// MIPS R3000 worker
// by simon and grok and deepseek and kimik2
// free to good home

// MIPS decode
// op6 rs5 rt5 rd5 sham5 func6
// op6 rs5 rt5 imm16
// op6 address26

// count clock cycles of MIPS r3000 core under emulation

let cycles=0;

const EXC_VECTOR = 0x80000080;
const EXC_OVF = 12;

const REG_HI=32;
const REG_LO=33;

const RegSize = 34;

const RamSize = 128 * 1024 * 1024; // 128M

const regs = new Uint32Array(RegSize);
const ram = new Uint32Array(RamSize);

//const  = 0x23; // Load Word

let pc = 0;
let epc = 0;
let cause = 0;

function handleTrap(causeCode) {
	epc = pc;
	cause = (causeCode << 2);
	pc = EXC_VECTOR;
	console.log(`Trap: Cause ${cause}, EPC ${epc}, New PC ${pc}`);
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
			const delaySlotPC = pc + 4; // Save next instruction
			pc = regs[rs] - 4;        // Target (adjusted)
			// Optional: Execute delaySlotPC here if needed
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
		case 0x18: // MULT (signed)
			cycles+=10;
			// Convert to 32-bit signed integers
			const a = regs[rs] | 0;
			const b = regs[rt] | 0;
			// Perform 32x32→64 multiplication
			const a_hi = (a >> 16) & 0xFFFF;
			const a_lo = a & 0xFFFF;
			const b_hi = (b >> 16) & 0xFFFF;
			const b_lo = b & 0xFFFF;
			// Partial products
			const p0 = a_lo * b_lo;
			const p1 = a_hi * b_lo;
			const p2 = a_lo * b_hi;
			const p3 = a_hi * b_hi;
			// Combine results
			const lo = p0 + ((p1 + p2) << 16);
			const hi = p3 + ((p1 + p2) >>> 16) + (lo >>> 31);
			// Store results (bitwise OR converts back to signed 32-bit)
			regs[32 /* HI */] = hi | 0;
			regs[33 /* LO */] = lo | 0;
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
		default:
			console.log("unsupported func6",hex(funk6));
		}
	return true;
}

function decodeMIPS(i32) {
	cycles++;
	const op6 = (i32 >> 26) & 0x3f;
	switch (op6) {
		case 0: // R-type
			const rs = (i32 >> 21) & 0x1f;
			const rt = (i32 >> 16) & 0x1f;
			const rd = (i32 >> 11) & 0x1f;
			const sham5 = (i32 >> 6) & 0x1f;
			const func6 = i32 & 0x3f;
			return rtypeOp(func6, rs, rt, rd, sham5);
		case 0x08:	//OP_ADDI: // 0x08 ADDI
			const rs_addi = (i32 >> 21) & 0x1f;
			const rt_addi = (i32 >> 16) & 0x1f;
			const imm = i32 & 0xffff;
			const signExtImm = (imm & 0x8000) ? (imm | 0xffff0000) : imm;
			const addiResult = regs[rs_addi] + signExtImm;
			if (addiResult > 0x7FFFFFFF || addiResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rt_addi] = addiResult;
			}
			break;
		case 0x20: // LB
			cycles += 2;
			regs[rt] = ((w >>> (24 - (al << 3))) & 0xFF) << 24 >> 24;
			break;
		case 0x21: // LH
			if (al & 1) return handleTrap(5);               // address error
			cycles += 2;
			regs[rt] = ((w >>> (16 - (al << 4))) & 0xFFFF) << 16 >> 16;
			break;

		case 0x23:	//OP_LW: // 0x23 LW
			cycles+=2;
			const rs_lw = (i32 >> 21) & 0x1f;
			const rt_lw = (i32 >> 16) & 0x1f;
			const imm_lw = i32 & 0xffff;
			const signExtImm_lw = (imm_lw & 0x8000) ? (imm_lw | 0xffff0000) : imm_lw;
			const addr = (regs[rs_lw] + signExtImm_lw) >> 2;
			regs[rt_lw] = ram[addr];
			break;

		case 0x24: // LBU
			cycles += 2;
			regs[rt] = (w >>> (24 - (al << 3))) & 0xFF;
			break;
		case 0x25: // LHU
			if (al & 1) return handleTrap(5);
			cycles += 2;
			regs[rt] = (w >>> (16 - (al << 4))) & 0xFFFF;
			break;
		case 0x28: // SB
			cycles += 2;
			ram[idx] = (w & ~(0xFF << (24 - (al << 3)))) |
					((regs[rt] & 0xFF) << (24 - (al << 3)));
			break;
		case 0x29: // SH
			if (al & 1) return handleTrap(5);
			cycles += 2;
			ram[idx] = (w & ~(0xFFFF << (16 - (al << 4)))) |
					((regs[rt] & 0xFFFF) << (16 - (al << 4)));
			break;
		case 0x2B: // SW
			cycles += 2;
			ram[idx] = regs[rt];
			break;

		default:
			console.log("unsupported op6",hex(op6));
	}
	return true;
}

function hex(i32){
	return i32.toString(16).padStart(8, '0');
}

function runTest() {
	pc = 0;
//	ram[1] = 4; // Store value 4 at ram[1] for LW test
	for (let i = 0; i < 8; i++) {
		const i32=ram[pc >> 2];
		if (!decodeMIPS(i32)) break;
		pc += 4;
		console.log("step",i,pc,hex(i32),"t0..t4=",hex(regs[8]),hex(regs[9]),hex(regs[10]),hex(regs[11]),hex(regs[12]));
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

console.log("test6 r3000");
runTest();


