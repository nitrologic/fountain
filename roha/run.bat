@echo off
chcp 65001 >nul
deno run --allow-run --allow-env --allow-net --allow-read --allow-write=./foundry forge.js
