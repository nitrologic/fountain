export PATH=$PATH:~/x-tools/mipsel-elf/bin
mipsel-elf-as -msoft-float -o bios.o bios.s
mipsel-elf-g++ -O2 -msoft-float -nostdlib -c -o mipsrom.o mipsrom.cpp
mipsel-elf-gcc -O2 -s -msoft-float -nostdlib -Ttext=0x80010000 -o mips2.elf bios.o mipsrom.o
mipsel-elf-readelf -h mips2.elf
mipsel-elf-nm mips2.elf
