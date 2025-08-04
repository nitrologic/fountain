.section .text,"ax"
.global SYS_RESET

SYS_RESET:
	lui	$gp,0x1f80
	lui	$sp,0x8020
	addiu	$sp,$sp,-36
	add	$s8,$zero,$zero
	lw	$ra,0($sp)
	addiu	$sp,$sp,4
	jr	$ra
	nop
