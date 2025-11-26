lsof -i :8081
pushd sloppy
deno task pipe
popd
