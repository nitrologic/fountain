lsof -i :8000
pushd roha
export USERDOMAIN=skid.nz
export USERNAME=skidracer
# deno --version
# deno task play
deno task fountain
popd
