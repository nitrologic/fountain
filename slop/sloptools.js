// sloptools.js
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License - See LICENSE file

import { mipsRegs, R3000 } from "./slopmips.js";

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

const SHT_OBJECT = 1;
const SHT_SYMTAB = 2;
const SHT_STRTAB = 3;

const ELF_BINDING_LOCAL=0;
const ELF_BINDING_GLOBAL=1;

const ELF_TYPE_NONE=0;
const ELF_TYPE_OBJECT=1;
const ELF_TYPE_FUNCTION=2;
const ELF_TYPE_SECTION=3;
const ELF_TYPE_FILE=4;

function parseStringTable(view, offset, size) {
	const strings = [];
	let buffer = "";
	for (let i = 0; i < size; i++) {
		const char = view.getUint8(offset + i);
		if (char === 0) {
			if (buffer.length > 0) {
				strings.push(buffer);
				buffer = '';
			}
		} else {
			buffer += String.fromCharCode(char);
		}
	}
	if (buffer.length > 0) {
		strings.push(buffer);
	}
	return strings;
}

function parseSymbolTable(view, offset, size, string_base) {
	const symbolTable={};
	const symbols = [];
	for (let i = 0; i < size; i += 16) {
		const st_name  = view.getUint32(offset + i, true);
		const st_value = view.getUint32(offset + i + 4, true);
		const st_size = view.getUint32(offset + i + 8, true);
		const st_info = view.getUint8(offset + i + 12);
		if(st_value==0) continue;	// ignore nulls
		let name = '';
		if (st_name) {
//			console.log("st_name",st_name);
			for (let j = st_name; ; j++) {
				const char = view.getUint8(string_base + j);
				if (!char) break;
				name += String.fromCharCode(char);
			}
		}
		symbols.push({name,value: st_value.toString(16),size: st_size,type: st_info & 0xF,binding: st_info >> 4});
		if(name.length&&st_value){
			const address=st_value.toString(16);
			symbolTable[address]=name;
		}
	}
	return {symbols,symbolTable};
}

export function parseElf(elfData, ram, cpu) {
	let symbols = [];
	let strings = [];
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

	const e_shnum = view.getUint16(48, true);
	const e_shentsize = view.getUint16(46, true);
	const e_shstrndx = view.getUint16(50, true);

	const pc_mask = 0x00fffffc;

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
			console.log(`Loading segment: vaddr=0x${p_vaddr.toString(16)}, size=0x${p_filesz.toString(16)}`);
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
				const loc32=p_vaddr+j;
				const op=val;
				if(j<3200){
//					console.log(cpu.disassemble(op,loc32));
				}
			}
			// Zero-fill any remaining memory (if p_memsz > p_filesz, e.g., for .bss)
			for (let j=p_filesz; j < p_memsz; j += 4) {
				ram[ramIdx + (j >> 2)]=0;
			}
		}
	}

// Parse section headers for symbols and strings
	if (e_shoff && e_shnum) {

		const shstrtab_off = e_shoff + e_shstrndx * e_shentsize;
		const shstrtab_offset = view.getUint32(shstrtab_off + 16, true);
		const shstrtab_size = view.getUint32(shstrtab_off + 20, true);

		let string_base = 0;

		// two passes needed so symbol table can preceed string table

		for(let pass=0;pass<2;pass++){

			for (let i = 0; i < e_shnum; i++) {
				const shoff = e_shoff + i * e_shentsize;
				const sh_type = view.getUint32(shoff + 4, true);
				const sh_offset = view.getUint32(shoff + 16, true);
				const sh_size = view.getUint32(shoff + 20, true);
				const sh_name = view.getUint32(shoff, true);
		
				let name = "";
				for (let j = sh_name; ; j++) {
					const ch = view.getUint8(shstrtab_offset + j);
					if (!ch) break;
					name += String.fromCharCode(ch);
				}
//				console.log("sh_name => ",name);
				// strings before symbols...
				if( pass==0 ){
					if (sh_type === SHT_STRTAB && name === ".strtab") {
						string_base = sh_offset;
						strings = parseStringTable(view, sh_offset, sh_size);
					}
				}else{
					if (sh_type === SHT_SYMTAB && name === ".symtab") {
						console.log("Symbols name:",name);
						if(!string_base){
							console.log("No String base for symbols");
							continue;
						}
						symbols = parseSymbolTable(view, sh_offset, sh_size, string_base);
					}
				}
			}
		}
	} else {
		console.log("No section headers found; skipping symbol parsing");
	}


	return {entry:e_entry,strings,symbols};
}
