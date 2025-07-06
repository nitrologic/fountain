pushd roha
export USERNAME="$USER"
export USERDOMAIN=$(scutil --get LocalHostName)
deno task roha
popd
