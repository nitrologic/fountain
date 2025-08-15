@echo off
echo owner,repo,exists,log_count > nitro_repos_info.csv

for /f "tokens=1,2 delims=," %%a in (nitro_repos.csv) do call :analyse %%a %%b

echo updated nitro_repos_info.csv
pause
goto :eof

:analyse
	set owner=%1
	set repo=%2
	set path=nitrologic\%repo%
	if exist "%path%" (
		set log_count=0
		pushd "%path%"
		for /f %%i in ('"C:\Program Files\Git\bin\git.exe" rev-list --count HEAD') do (
			set "log_count=%%i"
		)
		popd
		echo YUM %log_count%
		>>nitro_repos_info.csv echo %owner%,%repo%,yes,%log_count%
	) else (
		>>nitro_repos_info.csv echo %owner%,%repo%,no,0
	)
)
goto :eof
