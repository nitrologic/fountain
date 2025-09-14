lsof -i :8000
pushd sloppy
deno task botlisten
popd
