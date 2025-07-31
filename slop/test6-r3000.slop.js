// MIPS R3000 worker 
// by simon and grok
// free to good home

// MIPS decode
// op6 rs5 rt5 rd5 shamt5 funct6
// op6 rs5 rt5 imm16
// op6 address26

const RegSize = 42;
const RamSize = 128 * 1024 * 1024; // 128M

const regs = new Uint32Array(RegSize);
const ram = new Uint32Array(RamSize);

const EXC_VECTOR = 0x80000080;
const EXC_OVF = 12;
const F_ADD = 0x20;
const F_SUB = 0x22;
const F_AND = 0x24;
const F_OR = 0x25;
const F_SLL = 0x00;
const F_JR = 0x08;
const OP_ADDI = 0x08;
const OP_LW = 0x23; // Load Word

let pc = 0;
let epc = 0;
let cause = 0;

// Test program: ADDI, ADD, SUB, SLL, JR, LW
ram[0] = 0x00000000; // NOP
ram[1] = 0x24080005; // ADDI $t0, $zero, 5  (t0 = 5)
ram[2] = 0x2409000A; // ADDI $t1, $zero, 10 (t1 = 10)
ram[3] = 0x01095020; // ADD $t2, $t0, $t1   (t2 = 15)
ram[4] = 0x01095822; // SUB $t3, $t0, $t1   (t3 = -5)
ram[5] = 0x00095080; // SLL $t2, $t2, 2     (t2 = 15 << 2 = 60)
ram[6] = 0x8D040000; // LW $t4, 0($t0)      (t4 = ram[t0>>2])
ram[7] = 0x00000008; // JR $zero            (jump to 0, halt)

function handleTrap(causeCode) {
	epc = pc;
	cause = (causeCode << 2);
	pc = EXC_VECTOR;
	console.log(`Trap: Cause ${cause}, EPC ${epc}, New PC ${pc}`);
	return true;
}

function rtypeOp(rs, rt, rd, shamt, funct) {
	switch (funct) {
		case F_ADD: // ADD
			const addResult = regs[rs] + regs[rt];
			if (addResult > 0x7FFFFFFF || addResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd] = addResult;
			}
			break;
		case F_SUB: // SUB
			const subResult = regs[rs] - regs[rt];
			if (subResult > 0x7FFFFFFF || subResult < -0x80000000) {
				if (!handleTrap(EXC_OVF)) return false;
			} else {
				regs[rd] = subResult;
			}
			break;
		case F_AND: // AND
			regs[rd] = regs[rs] & regs[rt];
			break;
		case F_OR: // OR
			regs[rd] = regs[rs] | regs[rt];
			break;
		case F_SLL: // SLL
			regs[rd] = regs[rt] << shamt;
			break;
		case F_JR: // JR
			pc = regs[rs] - 4; // Adjust for PC increment in runTest
			break;
	}
	return true;
}

function decodeMIPS(i32) {
	const op6 = (i32 >> 26) & 0x3f;
	switch (op6) {
		case 0: // R-type
			const rs = (i32 >> 21) & 0x1f;
			const rt = (i32 >> 16) & 0x1f;
			const rd = (i32 >> 11) & 0x1f;
			const shamt = (i32 >> 6) & 0x1f;
			const funct = i32 & 0x3f;
			return rtypeOp(rs, rt, rd, shamt, funct);
		case OP_ADDI: // ADDI
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
		case OP_LW: // LW
			const rs_lw = (i32 >> 21) & 0x1f;
			const rt_lw = (i32 >> 16) & 0x1f;
			const imm_lw = i32 & 0xffff;
			const signExtImm_lw = (imm_lw & 0x8000) ? (imm_lw | 0xffff0000) : imm_lw;
			const addr = (regs[rs_lw] + signExtImm_lw) >> 2;
			regs[rt_lw] = ram[addr];
			break;
	}
	return true;
}

function runTest() {
	pc = 0;
	ram[1] = 4; // Store value 4 at ram[1] for LW test
	for (let i = 0; i < 8; i++) {
		if (!decodeMIPS(ram[pc >> 2])) break;
		pc += 4;
	}
	console.log(`Results: $t0=${regs[8]}, $t1=${regs[9]}, $t2=${regs[10]}, $t3=${regs[11]}, $t4=${regs[12]}`);
}
