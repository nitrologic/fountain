chcp 65001 >nul
echo nitrologic refresh ꘏ Fountain 1.3.7 ⛲  gpt-5-mini 🌐
@echo off
setlocal
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

:: simple version
:: for /D %%D in ("nitrologic\*") do pushd "%%D" && git pull && popd
