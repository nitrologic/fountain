echo off
echo Testing Slop Shop
echo see roha/deno.json for task options
rem 
rem fountain skeleton play net host 
pushd roha
rem deno task fountain
deno task play
rem deno task net
rem deno task host
rem deno task hello
popd
