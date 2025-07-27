@echo off
setlocal EnableDelayedExpansion

set DIR=..\rc5
set COMPILE_ARGS=--allow-run --allow-env --allow-net --allow-read --allow-write
set CORE=forge.md LICENSE fountain.md welcome.txt accounts.json modelspecs.json
set EXTRAS=isolation\readme.txt isolation\test.js foundry\notice.txt
set EXTRAS2=slopspec.json bibli.json
set DEPENDENCIES=%CORE% %EXTRAS2%

pushd ..\roha

if not exist "slopfountain.ts" (
	echo Error: slopfountain.ts not found.
	exit /b 1
)

deno cache slopfountain.ts
if errorlevel 1 (
	echo Error: Failed to cache dependencies.
	exit /b 1
)

deno compile --no-check %COMPILE_ARGS% --output %DIR%\slopfountain.exe slopfountain.ts
if errorlevel 1 (
	echo Error: Failed to compile slopfountain.ts.
	exit /b 1
)

if not exist "%DIR%\slopfountain.exe" (
	echo Error: slopfountain.exe not created.
	exit /b 1
)



if not exist "slopshop.ts" (
	echo Error: slopshop.ts not found.
	exit /b 1
)

deno cache slopshop.ts
if errorlevel 1 (
	echo Error: Failed to cache dependencies.
	exit /b 1
)

deno compile --no-check %COMPILE_ARGS% --output %DIR%\slopshop.exe slopshop.ts
if errorlevel 1 (
	echo Error: Failed to compile slopshop.ts.
	exit /b 1
)

if not exist "%DIR%\slopshop.exe" (
	echo Error: slopshop.exe not created.
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

popd

rem upx --best %DIR%\slopfountain.exe

exit /b 0
