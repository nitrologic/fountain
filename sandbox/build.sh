export PATH=$PATH:~/x-tools/mipsel-unknown-elf/bin
mipsel-unknown-elf-gcc --version
mipsel-unknown-elf-gcc -v -march=mips1 -msoft-float -nostdlib -Ttext=0x80010000 -o test.elf test.c
mipsel-unknown-elf-readelf -h test.elf
