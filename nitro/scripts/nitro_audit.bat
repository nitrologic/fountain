@echo off
echo nitrologic repos audit [%date% %time%]
:: origin  https://github.com/nitrologic/abc.git (push)
chcp 65001 >nul
echo ꘏ Fountain 1.3.7 ⛲ deepseek-chat 🐋 gpt-5-mini 🌐
setlocal
set count=0
for /D %%D in ("nitrologic\*") do (
	if exist "%%D\.git" (
::		for /f "delims=" %%R in ('git --git-dir="%%D\.git" config --get remote.origin.url 2^>nul') do (
		for /f "delims=" %%R in ('git --git-dir="%%D\.git" config list 2^>nul') do (
			echo url %%R
		)
		set /a count+=1
		if errorlevel 1 echo Failure updating %%D
	) else (
		echo Failed to update %%D
	)
)
echo Visited %count% repos.
endlocal

:: simple version
:: for /D %%D in ("nitrologic\*") do pushd "%%D" && git pull && popd
