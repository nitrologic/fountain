export PATH=$PATH:~/x-tools/mipsel-elf/bin
mipsel-elf-as -msoft-float -o bin/bios.o bios.s
mipsel-elf-g++ -O2 -msoft-float -nostdlib -c -o bin/mipsrom.o mipsrom.cpp
mipsel-elf-gcc -O2 -s -msoft-float -nostdlib -Ttext=0x80010000 -o bin/mips2.elf bin/bios.o bin/mipsrom.o
pushd bin
mipsel-elf-readelf -h mips2.elf
mipsel-elf-nm --size-sort mips2.elf
mipsel-elf-size mips2.elf
mipsel-elf-objdump -h mips2.elf
popd
