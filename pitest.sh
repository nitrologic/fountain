ss -lp sport = :8000
pushd roha
export USERNAME="$USER"
export USERDOMAIN="$HOSTNAME"
deno --version
#deno task fountain
deno task sloppy
popd
