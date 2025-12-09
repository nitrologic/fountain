rmdir /s /q bin
mkdir bin
cmake -G "Visual Studio 17 2022" -S . -B bin
pushd bin
rem ninja make whu
cmake --build . --config Release
popd

