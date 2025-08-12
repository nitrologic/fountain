@echo off
chcp 65001 >nul
setlocal
echo nitrologic updating stats [%date% %time%]
echo Fountain 1.3.7 ⛲  grok-4-0709 🚀
echo owner,repo,exists,size_bytes,files > nitro_repos_stats.csv
for /f "tokens=1,2 delims=," %%a in (nitro_repos.csv) do call :analyse %%a %%b
echo updated nitro_repos_stats.csv
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
	>>nitro_repos_stats.csv echo %owner%,%repo%,yes,!total_size!,!file_count!
) else (
	>>nitro_repos_stats.csv echo %owner%,%repo%,no,0,0,0
)
goto :eof
