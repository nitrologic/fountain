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
