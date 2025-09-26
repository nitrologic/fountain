lsof -i :8000
pushd roha
export USERNAME="$USER"
export USERDOMAIN=$(hostname -s)
# deno --version
# deno task play
deno task fountain
popd
