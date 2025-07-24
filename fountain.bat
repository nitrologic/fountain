echo off
echo Testing Slop Fountain 
echo see roha/deno.json for task options
rem 
rem fountain skeleton play net host 
pushd roha
deno task fountain
rem deno task play
rem deno task net
rem deno task host
rem deno task hello
popd
