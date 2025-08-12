@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
echo nitrologic clone repos ꘏ Fountain 1.3.7 ⛲  gpt-5-mini 🌐
echo Cloning repositories.
for /f "tokens=1,2 delims=," %%a in (nitro_repos.csv) do (
    call :clone %%a %%b
)
echo Clone operations complete.
pause
goto :eof

:clone
set "owner=%1"
set "repo=%2"
echo Cloning %owner%/%repo%...
git clone https://github.com/%owner%/%repo%.git nitrologic/%repo%
if %ERRORLEVEL% neq 0 (
    echo Failed to clone %owner%/%repo%
) else (
    echo Successfully cloned %owner%/%repo%
)
goto :eof
