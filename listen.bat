chcp 65001
echo off
echo Running Sloppy the Janitor  
echo see sloppy/sloppy.md for more information
pushd sloppy
deno task listen
popd
