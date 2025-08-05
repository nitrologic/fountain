// sloptools.js
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

import { mipsRegs, R3000 } from "./slopmips.js";

// MIPS ELF tools

export function dumpBin(bin){
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

// ======================================================
// parseElf
// ======================================================

// ELF constants

const ELF_MAGIC=0x464C457F; // "\x7FELF"
const ELF_CLASS32=1;
const ELF_DATA2LSB=1;
const ELF_EM_MIPS=8;

export function parseElf1(elfData,ram) {
	const RamSize=ram.length;
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
	const e_shoff = view.getUint32(32, true);
	const e_phnum=view.getUint16(44, true); // Number of program headers
	const e_phentsize=view.getUint16(42, true); // Size of each program header

	const pc_mask=0x00fffffc;

	console.log("entry point",e_entry.toString(16));
	// Load program segments
	for (let i=0; i < e_phnum; i++) {
		const phoff=e_phoff + i * e_phentsize;
		const p_type=view.getUint32(phoff, true);
		const p_offset=view.getUint32(phoff + 4, true);
		const p_vaddr=view.getUint32(phoff + 8, true);
		const p_filesz=view.getUint32(phoff + 16, true);
		const p_memsz=view.getUint32(phoff + 20, true);
		const vaddr24=p_vaddr&pc_mask;
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
//				if(true||j<32){
//					console.log(r3000.disassemble(op,loc));
//				}
			}
			// Zero-fill any remaining memory (if p_memsz > p_filesz, e.g., for .bss)
			for (let j=p_filesz; j < p_memsz; j += 4) {
				ram[ramIdx + (j >> 2)]=0;
			}
			console.log(`Loaded segment: vaddr=0x${p_vaddr.toString(16)}, size=0x${p_filesz.toString(16)}`);
		}
	}
	return e_entry;
}



export function parseElf(elfData, ram) {

	const RamSize=ram.length;
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
	const e_shoff = view.getUint32(32, true);
	const e_phnum=view.getUint16(44, true); // Number of program headers
	const e_phentsize=view.getUint16(42, true); // Size of each program header

	const pc_mask=0x00fffffc;

	console.log("entry point",e_entry.toString(16));

	if (e_shoff && e_shnum) {
		const shstrtab_offset = view.getUint32( e_shoff + (e_shstrndx * e_shentsize) + 16,true);
		for (let i = 0; i < e_shnum; i++) {
			const shoff = e_shoff + (i * e_shentsize);
			const sh_type = view.getUint32(shoff + 4, true);
			const sh_name = view.getUint32(shoff, true);
			const sh_addr = view.getUint32(shoff + 12, true);
			const sh_offset = view.getUint32(shoff + 16, true);
			const sh_size = view.getUint32(shoff + 20, true);
			let name = '';
			for (let j = sh_name; ; j++) {
				const char = view.getUint8(shstrtab_offset + j);
				if (!char) break;
				name += String.fromCharCode(char);
			}
			if (sh_type === 2) {
				const symtab = parseSymbolTable(view, sh_offset, sh_size,elfData, e_shoff, e_shentsize);
				console.log('Symbols:', symtab);
			}
		}
	}
}

function parseSymbolTable(view, offset, size, elfData, shoff, shentsize) {
	const symbols = [];
	const strtab_offset = 0;
	for (let i = 0; i < size; i += 16) {
		const st_name  = view.getUint32(offset + i, true);
		const st_value = view.getUint32(offset + i + 4, true);
		const st_size = view.getUint32(offset + i + 8, true);
		const st_info = view.getUint8(offset + i + 12);
		let name = '';
		if (st_name) {
			for (let j = st_name; ; j++) {
				const char = view.getUint8(strtab_offset + j);
				if (!char) break;
				name += String.fromCharCode(char);
			}
		}
		symbols.push({name,value: st_value,size: st_size,type: st_info & 0xF,binding: st_info >> 4});
	}
	return symbols;
}