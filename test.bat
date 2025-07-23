echo off
echo Testing Slop Fountain 
echo see roha/deno.json for task options

rem skeleton play net host slopfountain
pushd roha
rem deno task slopfountain
deno task play
rem deno task net
rem deno task host
rem deno task hello
popd
