echo off
echo %LANG%
chcp 65001 > nul
set TERM_PROGRAM=vscode
echo Testing Slop Fountain 
echo see roha/deno.json for task options
pushd roha
deno task fountain
popd
