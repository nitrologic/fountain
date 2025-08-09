@echo off
setlocal EnableDelayedExpansion
echo Analysing clones
for /f "tokens=1,2 delims=," %%a in (nitro_repos.csv) do (
	call :analyse %%a %%b
rem call :analyse2 %%a %%b
)
echo updated nitro_repos_stats.csv
pause
goto :eof

:analyse2
	set "owner=%1"
	set "repo=%2"
	dir "nitrologic\%repo%" /S
	goto :eof

:analyse
		set "owner=%1"
		set "repo=%2"
		set "path=nitrologic\%repo%"
		set "file_count=0"
		set "dir_count=0"
		set "total_size=0"
if exist "%path%" (
    pushd "%path%"
    for /f "tokens=1,2,3,4,5*" %%i in ('dir /s /-c') do (
        if "%%j"=="File(s)" (
            set file_count=%%i
            set total_size=%%k
        )
        if "%%j"=="Dir(s)" (
            set dir_count=%%i
        )
    )
    popd
    rem remove commas from size (plain DOS trick)
    set total_size=%total_size:,=%
    set /a total_size=%total_size%/1024
    >>nitro_repos_stats.csv echo %owner%,%repo%,yes,%total_size%,%file_count%,%dir_count%
) else (
    >>nitro_repos_stats.csv echo %owner%,%repo%,no,0,0,0
)
goto :eof