echo off
echo %LANG%
echo Testing Slop Fountain 
echo see roha/deno.json for task options
pushd roha
deno task fountain
popd
