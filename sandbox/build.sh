export PATH=$PATH:~/x-tools/mipsel-elf/bin

#mipsel-elf-as --version
mipsel-elf-as --gstabs -msoft-float -o bios.o bios.s

#mipsel-elf-g++ --version
mipsel-elf-g++ -g -msoft-float -nostdlib -c -o mipsrom.o mipsrom.cpp

#mipsel-elf-gcc --version
mipsel-elf-gcc -msoft-float -nostdlib -Ttext=0x80010000 -o mips1.elf bios.o mipsrom.o

# show elf result
mipsel-elf-readelf -h mips1.elf

# show symbols
mipsel-elf-nm mips1.elf
