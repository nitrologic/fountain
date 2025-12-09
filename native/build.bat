@echo off

rem clean target bin
rmdir /s /q bin
mkdir bin

rem generate solution
rem   -S .   : source directory is current folder
rem   -B bin : put all generated files into .\bin
rem cmake -G "Visual Studio 17 2022" -S . -B bin
cmake -S . -B bin

rem enter build folder
pushd bin

rem compile the project (Release config)
rem   --build .        : build inside current directory
rem   --config Release : use Release configuration
cmake --build . --config Release

popd
