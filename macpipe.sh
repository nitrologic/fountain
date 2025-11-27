# lsof -i :8000
rm /tmp/sloppy.sock
pushd sloppy
deno task pipe
popd
