@echo off
setlocal EnableDelayedExpansion

set DIR=rc3
set COMPILE_ARGS=--allow-run --allow-env --allow-net --allow-read --allow-write
set CORE=forge.md LICENSE fountain.md welcome.txt accounts.json modelrates.json
set EXTRAS=isolation\readme.txt isolation\test.js foundry\notice.txt
set DEPENDENCIES=%CORE% %EXTRAS%

if not exist "fountain.js" (
	echo Error: fountain.js not found.
	exit /b 1
)

deno cache fountain.js
if errorlevel 1 (
	echo Error: Failed to cache dependencies.
	exit /b 1
)

deno compile %COMPILE_ARGS% --output %DIR%\fountain.exe fountain.js
if errorlevel 1 (
	echo Error: Failed to compile fountain.js.
	exit /b 1
)

if not exist "%DIR%\fountain.exe" (
	echo Error: fountain.exe not created.
	exit /b 1
)

set MISSING=0
for %%F in (%DEPENDENCIES%) do (
	if exist "%%F" (
		set TARGET=%DIR%\%%F
		xcopy /Y /-I /F "%%F" "%DIR%\%%F" && (
			echo   Copied %%F
		) || (
			echo   Failed to copy %%F
			set /a MISSING+=1
		)
	) else (
		echo   %%F not found
		set /a MISSING+=1
	)
)

if !MISSING! gtr 0 (
	echo "Failure, please check dependencies."
	exit /b 1
)

echo Forge %DIR% build completed.

rem upx --best %DIR%\fountain.exe

exit /b 0
