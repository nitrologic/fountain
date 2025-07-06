@echo off
chcp 65001 >nul
rem deno run --allow-sys --allow-net --allow-run --allow-env --allow-read --allow-write=./forge fountain.js
rem deno run --allow-net server.ts
deno task slop
