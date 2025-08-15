the sprawl

# 𓄷𓄲𓄵 𓄷𓄲𓄲 ⛲

Slowly the nitrologic archives are dropped in the fountain.

## recent changes

1. nitrologic linux delisted and removed - obese does not come close
2. nitrologic steamstub2 and nitrocircuit delisted - empty repos detected
3. nitrologic dsptool - case sensitive issue 'bios/README.md' 'bios/readme.md' - fix me
4. nitrologic evict wizbang kiosk playfab winding
5. nitrologic evict loadrite ninjakiwi uae nextspace

## batch files

The following nitro_stat.bat file enumerates the nitrologic github directories passing 
the last line of interest from common dir command:

> dir /s /-c /A-D-H

Note the modern use of setlocal enabledelayedexpansion which complicates the already
confusing notion that variables and logic live in alternative universed in the .bat
universe and may have contributed to the downfall of the common .bat environment.

```
@echo off
set src=../nitrologic_github.csv
set dest=../audit/nitro_repos_stats_dos.csv
chcp 65001 >nul
setlocal

echo nitro_stat.bat updating stats [%date% %time%]
echo Fountain 1.3.8 ⛲  grok-4-0709 🚀 deepseek-chat 🐋

echo owner,repo,exists,size_bytes,files >  %dest%
for /f "tokens=1,2 delims=," %%a in (%src%) do call :analyse %%a %%b
echo updated  %dest%
pause
goto :eof

:analyse
setlocal enabledelayedexpansion
set owner=%1
set repo=%2
set path=nitrologic\%repo%
if exist "%path%\.git" (
	set file_count=0
	set total_size=0
	pushd "%path%"
	for /f "tokens=1,2,3,4,5" %%i in ('dir /s /-c /A-D-H') do (
		if "%%j"=="File(s)" (
			set file_count=%%i
			set total_size=%%k
		)
	)
	popd
	>>%dest% echo %owner%,%repo%,yes,!total_size!,!file_count!
) else (
	>>%dest% echo %owner%,%repo%,no,0,0
)
goto :eof
```

## housekeeping

> dir nitrologic /b > files.txt

https://github.com/nitrologic
48 public
63 private

## forked

uae ammo.js voxel-model linux libcec collada2 django-tenants
gltf nitrotoken monkey2 blitzmax-dpi-denial

## disorder

## nitrologic github

- nitrologic.github.io: nitrologic/nitrologic.github.io
- nitrologic: nitrologic/nitrologic

### fountain

- fountain: nitrologic/fountain
- biblispec: nitrologic/biblispec
- forge: nitrologic/forge *
- foundry: nitrologic/foundry *
- roha: nitrologic/roha *

### studio

- dsptool: nitrologic/dsptool
- dspstudio: nitrologic/dspstudio

## audio

- vsynth: nitrologic/vsynth
- freeaudio: nitrologic/freeaudio
- miditool: nitrologic/miditool
- audiotool: nitrologic/audiotool
- hidapi: libusb/hidapi

## embedded

- yaroze: nitrologic/yaroze
- picotool: nitrologic/picotool
- pico-sdk: raspberrypi/pico-sdk
- skid30: nitrologic/skid30
- stereobasic: nitrologic/stereobasic
- acidvm: nitrologic/acidvm

## local terrain

- roa: nitrologic/roa
- roanz: nitrologic/roanz
- roagrid: nitrologic/roagrid
- skidroa: nitrologic/skidroa
- tileshop: nitrologic/tileshop
- bakery: nitrologic/bakery
- pipeline: nitrologic/pipeline
- pipeline2: nitrologic/pipeline2
- stage: nitrologic/stage
- stage2: nitrologic/stage2
- stage3: nitrologic/stage3
- stage4: nitrologic/stage4

## blitz

- blitz2: nitrologic/blitz2
- acidpd: nitrologic/acidpd
- blitz3d: nitrologic/blitz3d
- bbarchives: nitrologic/bbarchives
- steamstub: nitrologic/steamstub
- steamstub2: nitrologic/steamstub2
- blitzmax: blitz-research/blitzmax
- blitzmax20: nitrologic/blitzmax20
- blitzmax-dpi-denial: nitrologic/blitzmax-dpi-denial
- maxide: nitrologic/maxide
- maxgui2.mod: nitrologic/maxgui2.mod

## monkey2

- monkey2: nitrologic/monkey2
- axe.mod: nitrologic/axe.mod
- m2: nitrologic/m2
- mx2: nitrologic/mx2
- ffmpeg: nitrologic/ffmpeg
- mx2core: nitrologic/mx2core
- mx2mojo: nitrologic/mx2mojo
- mojolab: nitrologic/mojolab
- mojolabs: nitrologic/mojolabs
- bbcom: nitrologic/bbcom

## career private

- ninjakiwi: nitrologic/ninjakiwi
- loadrite: nitrologic/loadrite
- fusion: nitrologic/fusion
- nextspace: nitrologic/nextspace

## acid private

- acid: nitrologic/acid
- skidnz: nitrologic/skidnz

## mirrors

- glTF: nitrologic/glTF
- mojo3d-vr: nitrologic/mojo3d-vr
- libsgd: blitz-research/libsgd
- voxel-model: nitrologic/voxel-model
- linux: nitrologic/linux
- uae: nitrologic/uae

unsorted

plainview: nitrologic/plainview
acid8: nitrologic/acid8
worldbody: nitrologic/worldbody
plainhost: nitrologic/plainhost
mobstar: nitrologic/mobstar
waveform: nitrologic/waveform
itouch: nitrologic/itouch
touch: nitrologic/touch
postphysics: nitrologic/postphysics
asmcoder: nitrologic/asmcoder
diversity: nitrologic/diversity
wasted: nitrologic/wasted
wire: nitrologic/wire
space: nitrologic/space
vector0: nitrologic/vector0
studio: nitrologic/studio
nod: nitrologic/nod
grid: nitrologic/grid
score: nitrologic/score
nitro: nitrologic/nitro
scout: nitrologic/scout
simon: nitrologic/simon
drawline: nitrologic/drawline
basement: nitrologic/basement
geom: nitrologic/geom
mod: nitrologic/mod
n3d: nitrologic/n3d
nitrovr: nitrologic/nitrovr
winmain: nitrologic/winmain
shape: nitrologic/shape
nano: nitrologic/nano
sphinx: nitrologic/sphinx
media: nitrologic/media
emu: nitrologic/emu

nitrotoken: nitrologic/nitrotoken
nitrojs: nitrologic/nitrojs
nitroclient: nitrologic/nitroclient
nitrodocs: nitrologic/nitrodocs
nitrosdk: nitrologic/nitrosdk
abc: nitrologic/abc
