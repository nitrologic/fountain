export PATH=$PATH:~/x-tools/mipsel-elf/bin

#mipsel-elf-as --version

mipsel-elf-as -o bios.o bios.s

#mipsel-elf-gcc --version
#mipsel-elf-gcc -v -march=mips1 -msoft-float -nostdlib -Ttext=0x80010000 -o test.elf test.c

#mipsel-elf-gcc -x c++ -march=mips1 -msoft-float -nostdlib -c -o test.o test.cpp
mipsel-elf-g++ -march=mips1 -msoft-float -nostdlib -c -o mipsrom.o mipsrom.cpp

#mipsel-elf-g++ --version

mipsel-elf-gcc -march=mips1 -msoft-float -nostdlib -Ttext=0x80010000 -o mips1.elf bios.o mipsrom.o

mipsel-elf-readelf -h mips1.elf
