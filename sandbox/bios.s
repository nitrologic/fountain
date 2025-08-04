.section .text,"ax"
.global _start

_start:
	lui	$gp,0x1f80
	lui	$sp,0x8020
	jal	boot
	nop
