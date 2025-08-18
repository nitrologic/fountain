export PATH=$PATH:~/x-tools/mipsel-elf/bin

#mipsel-elf-as --version
#mipsel-elf-g++ --version
#mipsel-elf-gcc --version

mipsel-elf-g++ -g -msoft-float -nostdlib -c -o testio.o testio.cpp

mipsel-elf-gcc -msoft-float -nostdlib -Ttext=0x80010000 -o mips2.elf testio.o

# show elf result
mipsel-elf-readelf -h mips2.elf
# show symbols
mipsel-elf-nm mips2.elf
