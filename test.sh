pushd roha
export USERNAME="$USER"
export USERDOMAIN=$(scutil --get LocalHostName)
deno run --allow-net --allow-run --allow-env --allow-read --allow-write=./forge fountain.js
popd
