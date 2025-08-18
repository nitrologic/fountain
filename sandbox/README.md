# mips sandbox

I wrote a Java VM for Playstation 1 in 1996

I was hoping to effect a home computer using the action replay cartridge and a PC keybord adapter I had prototyped with a Scenix SX28.

Java was from the future and the MIPS processors were straight out of Jurassic Park.

The crosstool-ng project was used to build bare metal MIPS toolchain.

# recent journey back


## bare metal compilers

### install crosstooll ng

> cd crosstool-ng/

### configure via menu

> ct-ng menuconfig

### build for 25..45 minutes or until risen

> ct-ng build

## current status

With the bare metal C++ compiler we can bolt on our own stdlib.

But having a newlib fail to build??? Oh...

There are some .h header files in play from the C side features in files.txt which we could check in on first.

````
[INFO ]  Installing core C gcc compiler: done in 1516.22s (at 31:34)
[INFO ]  =================================================================
[INFO ]  Installing C library
[EXTRA]    Configuring C library
[EXTRA]    Building C library
[ERROR]    /home/skid/crosstool-ng/.build/mipsel-elf/src/newlib/libgloss/mips/test.c:12:3: error: 'return' with no value, in function returning non-void [-Wreturn-mismatch]
[ERROR]    make[5]: *** [Makefile:105: test.o] Error 1
[ERROR]    make[5]: *** Waiting for unfinished jobs....
[ERROR]    make[4]: *** [Makefile:9835: all-recursive] Error 1
[ERROR]    make[3]: *** [Makefile:3158: all] Error 2
[ERROR]    make[2]: *** [Makefile:9531: all-target-libgloss] Error 2
[ERROR]    make[1]: *** [Makefile:882: all] Error 2
[ERROR]
[ERROR]  >>
[ERROR]  >>  Build failed in step 'Installing C library'
[ERROR]  >>        called in step '(top-level)'
[ERROR]  >>
[ERROR]  >>  Error happened in: CT_DoExecLog[scripts/functions@378]
[ERROR]  >>        called from: newlib_main[scripts/build/libc/newlib.sh@116]
[ERROR]  >>        called from: do_libc_main[scripts/build/libc.sh@33]
[ERROR]  >>        called from: main[scripts/crosstool-NG.sh@712]
[ERROR]  >>
[ERROR]  >>  For more info on this error, look at the file: 'build.log'
[ERROR]  >>  There is a list of known issues, some with workarounds, in:
[ERROR]  >>      https://crosstool-ng.github.io/docs/known-issues/
[ERROR]  >>
[ERROR]  >>  If you feel this is a bug in crosstool-NG, report it at:
[ERROR]  >>      https://github.com/crosstool-ng/crosstool-ng/issues/
[ERROR]  >>
[ERROR]  >>  Make sure your report includes all the information pertinent to this issue.
[ERROR]  >>  Read the bug reporting guidelines here:
[ERROR]  >>      http://crosstool-ng.github.io/support/
[ERROR]
[ERROR]  (elapsed: 32:06.12)
[32:06] / gmake: *** [/usr/local/bin/ct-ng:261: build] Error 2
```
