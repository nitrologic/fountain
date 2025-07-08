ss -lnp sport = :8000
pushd roha
export USERNAME="$USER"
export USERDOMAIN="$HOSTNAME"
deno --version
deno task roha
popd
