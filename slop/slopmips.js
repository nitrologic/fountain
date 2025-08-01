// slopmips.js
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

export const BrailleCode=0x2800;

const mops1=[
	"Anop",															//0
	"Rsll","Bdw","Rsrl","Rsra","Esllv","Bdw","Esrlv","Esrav",		//1
	"Jjr","Sjalr","Bdw","Bdw","Bsyscall","Kbreak","Bdw","Bdw",		//9	
	"Gmfhi","Hmthi","Gmflo","Hmtlo","Bdw","Bdw","Bdw","Bdw",		//17
	"Lmult","Lmultu","Ldiv","Ldivu","Bdw","Bdw","Bdw","Bdw",		//25
	"Dadd","Daddu","Dsub","Dsubu","Dand","Dor","Dxor","Dnor",		//33
	"Bdw","Bdw","Dslt","Dsltu","Bdw","Bdw","Bdw","Bdw",				//41
	"Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw",				//49
	"Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw",				//57
	"Fbltz","Fbgez","Fbltzal","Fbgezal",							//65
	"Mj","Mjal","Pbeq","Pbne","Fblez","Fbgtz",						//69
	"Iaddi","Iaddiu","Islti","Isltiu","Iandi","Iori","Ixori","Nlui",//75
	"Qcop0","Qcop1","Qcop2","Qcop3","Bdw","Bdw","Bdw","Bdw",		//83
	"Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw","Bdw",				//91
	"Olb","Olh","Olwl","Olw","Olbu","Olhu","Olwr","Bdw",			//99
	"Osb","Osh","Oswl","Osw","Bdw","Bdw","Oswr","Bdw",				//107
	"Clwc0","Clwc1","Clwc2","Clwc3","Bdw","Bdw","Bdw","Bdw",		//115
	"Cswc0","Cswc1","Cswc2","Cswc3","Bdw","Bdw","Bdw","Bdw",		//123
	"Umfc0","Umfc1","Umfc2","Umfc3","Ucfc0","Ucfc1","Ucfc2","Ucfc3",//131
	"Umtc0","Umtc1","Umtc2","Umtc3","Uctc0","Uctc1","Uctc2","Uctc3",//139
	"Tbc0f","Tbc1f","Tbc2f","Tbc3f","Tbc0t","Tbc1t","Tbc2t","Tbc3t"	//147
];																	//155

export const mipsRegs = [
	"z0", "at", "v0", "v1", "a0", "a1", "a2", "a3",
	"t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7",
	"s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7",
	"t8", "t9", "k0", "k1", "gp", "sp", "s8", "ra"
];

function padHex(i32){
	return i32.toString(16).padStart(8,"0");
}

export class R3000 {
	dump(ops) {
		let n = (ops[ops.length - 2] >> 2);
		let result = [];
		for (let i = 0; i < n; i++) {
			result.push(this.disassemble(ops[i], i * 4));
		}
		return result.join('');
	}

	disassemble(op, loc) {
		let i = (op >>> 26) & 0x3f;
		let mop, rd, rt, rs, imm;

		switch (i) {
			case 0:
				if (op !== 0) i = (op & 0x3f) + 1;
				break;
			case 1:
				i = 65 + ((op >>> 16) & 1) + ((op >>> 19) & 2);
				break;
			case 2:
				i = 69;
				break;
			case 3:
				i = 70;
				break;
			case 16: case 17: case 18: case 19:
				if ((op & 0x02000000) !== 0) {
					i = 71 + i - 4;
					break;
				}
				let j = (op >>> 22) & 7;
				if (j < 4) {
					i = 71 + 48 + j * 4 + i - 4;
					break;
				}
				i = 71 + 64 + i - 4 + ((op & 0x10000) >>> 14);
				break;
			default:
				i = 71 + i - 4;
				break;
		}

		mop = mops1[i];
		imm = op & 0xffff;
		if (imm & 0x8000) imm -= 0x10000; // Sign-extend
		rd = mipsRegs[(op >>> 11) & 31];
		rt = mipsRegs[(op >>> 16) & 31];
		rs = mipsRegs[(op >>> 21) & 31];

		let output=padHex(loc)+" "+padHex(op)+" "+mop.substring(1)+" ";
		switch (mop[0]) {
			case 'A': // nop
				break;
			case 'B': // system,???
				output += `0x${(op >>> 6 & 0x000fffff).toString(16)}`;
				break;
			case 'C': // lwc,swc
				output += `${rt},${imm}(${rs})`;
				break;
			case 'D': // add,addu,sub,subu,and,or,xor,nor,slt,sltu
				output += `${rd},${rs},${rt}`;
				break;
			case 'E': // sllv,srlv,srav
				output += `${rd},${rt},${rs}`;
				break;
			case 'F': // bltz,bgez,bltzal,bgezal,blez,bgtz
				output += `${rs},${imm}`;
				break;
			case 'G': // mfhi,mflo
				output += rd;
				break;
			case 'H': // mthi,mtlo
				output += rs;
				break;
			case 'I': // addi,addiu,slti,sltiu,andi,ori,xori
				output += `${rt},${rs},0x${imm.toString(16)}`;
				break;
			case 'J': // jr
				output += rs;
				break;
			case 'K': // break
				output += `0x${((op >>> 6) & 0xfffff).toString(16)}`;
				break;
			case 'L': // mult,multu,div,divu
				output += `${rs},${rt}`;
				break;
			case 'M': // j,jal
				output += `0x${(loc & 0xf0000000 | (op & 0x03ffffff) << 2).toString(16)}`;
				break;
			case 'N': // lui
				output += `${rt},0x${imm.toString(16)}`;
				break;
			case 'O': // lb,lh,lwl,lw,lbu,lhu,lwr,sb,sh,swl,sw,swr
				output += `${rt},0x${imm.toString(16)}(${rs})`;
				break;
			case 'P': // beq,bne
				output += `${rs},${rt},${imm}`;
				break;
			case 'Q': // cop0,cop1,cop2,cop3
				output += `0x${(op & 0x1ffffff).toString(16)}`;
				break;
			case 'R': // sll,srl,sra
				output += `${rd},${rt},${(op >>> 6) & 31}`;
				break;
			case 'S': // jalr
				if (rd === 'ra') output += rs;
				else output += `${rd},${rs}`;
				break;
			case 'T': // bczf,bczt
				output += imm;
				break;
			case 'U': // mfc,cfc,mtc,ctc
				output += `${rt},${rd}`;
				break;
		}
		return output;
	}
}

// Example usage:
//const r3000 = new R3000();
//const ops = [0x00230820, 0x00000000, 2]; // Example: add $at, $at, $v1; nop
//console.log(r3000.dump(ops));
