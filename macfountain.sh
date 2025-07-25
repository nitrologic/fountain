lsof -i :8000
pushd roha
export USERNAME="$USER"
export USERDOMAIN=$(scutil --get LocalHostName)
# deno --version
# deno task play
deno task fountain
popd
