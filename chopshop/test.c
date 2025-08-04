void _start(void) {
    volatile unsigned int *gpu = (unsigned int *)0x1F801810; // PS1 GPU register
    *gpu = 0x00000000; // Clear GPU status
    while (1);
}