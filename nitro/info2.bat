@echo off
echo owner,repo,exists,log_count > nitro_repos_info2.csv

for /f "tokens=1,2 delims=," %%a in (nitro_repos.csv) do call :analyse %%a %%b

echo updated nitro_repos_info2.csv
pause
goto :eof

:analyse
	set owner=%1
	set repo=%2
	set path=nitrologic\%repo%
	if exist "%path%" (
		set remote_url=0
		pushd "%path%"
        for /f %%i in ('"C:\Program Files\Git\bin\git.exe" config remote.origin.url') do (
            set "remote_url=%%i"
        )
		popd
		echo YUM %remote_url%
		>>nitro_repos_info2.csv echo %owner%,%repo%,yes,%remote_url%
	) else (
		>>nitro_repos_info2.csv echo %owner%,%repo%,no,0
	)
)
goto :eof
