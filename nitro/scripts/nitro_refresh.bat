@echo off
setlocal
chcp 65001 >nul
echo nitrologic refresh repos [%date% %time%]
echo ꘏ Fountain 1.3.7 ⛲ deepseek-chat 🐋 gpt-5-mini 🌐
set count=0
for /D %%D in ("nitrologic\*") do (
	if exist "%%D\.git" (
		attrib -R "%%D" /S /D
		git -C "%%D"  pull :: --quiet >nul 2>&1
		set /a count+=1
		attrib +R "%%D" /S /D
		if errorlevel 1 echo Failure updating %%D
	) else (
		echo Failed to update %%D
	)
)
echo Updated %count% repos.
endlocal

:: origin  https://github.com/nitrologic/abc.git (push)

:: simple version
:: for /D %%D in ("nitrologic\*") do pushd "%%D" && git pull && popd
