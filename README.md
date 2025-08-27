[![Deno](https://img.shields.io/badge/deno-2.4.2-black?logo=deno)](https://deno.land/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

# ꕶLOP Fountain ⛲

Home of nitrologic slop fountain — the 4th generation roha foundry forge LLM tool.

Exposing 302 models from 11 providers the research project Fountain 4 ⛲ approaches connected.

> Planet earth is blue and there is nothing I can do - David Bowie

> maximum prompt length exceeded - every model ever


## Recent Personal Usage

Processing the logs with experimental /raw command. 

We began the month changing to hex 16ths of a second timestamping, because...

````
890aa20 [roha] [STRIP] /raw/forge-macos-6e20e81-86e50d3.log 12297 Mon Aug 04 2025 Fri Aug 22 2025
890aa20 [roha] [STRIP] /raw/forge-windows-6d97ea5-878fcbd.log 68682 Sun Aug 03 2025 Sat Aug 23 2025
````

The first two line counts are lines typed or pasted by myself, fountain user 0, from PC and MacBook.

* nitro@ryzen5 2857
* simon@midnightblue 268

The next is a line count of the models under test, my top 5 for August to date.

* deepseek-chat 15024
* gpt-5-mini 6853
* claude-sonnet-4 6637
* grok-4-0709 1969
* kimi-k2-0711 890

## Latest Commits

The raw prompt mode is a low level keyboard driver designed to add new features to Fountain input

* shortcode :eyes: type : eyes :
* tab support - huh, no wonder the vanilla Deno prompt() is tab free
* history support - cursor up to step back through command history like a real shell
* async cursor keys - prepare to fire cursor and extended key presses at slop workers in focus

## Researcher Links

* [fountain.md](roha/fountain.md) Configuration
* [forge.md](roha/forge.md) Command Set
* [plan.txt](roha/plan.txt) On the list
* [license](LICENSE) Copyright (c) 2025 Simon Armstrong - MIT License

# blog commentary

* [blog-sloppy](sloppy/sloppy.md) a discord bot calls home 
* [blog-lab](lab/README.md) on the bench and in the sandbox - a bare metal MIPS R3000 tool chain side project
* [blog-nitrologic](nitro/nitrologic.md) the sprawl - a stream of notions in recreational programming
* [blog-slops](slop/blog2/blogust.md) 𐃅 recent test slop for fountain dwellers
* [blog-fountain](slop/blog/blogfountain.md) recent fountain models under test
* [blog-forge](https://github.com/nitrologic/forge/blob/main/blog.md) archived forge model under test

## Developer setup

Install [Deno 2.4](https://deno.com/)

## Example output

> /account
```
╭────┬────────────┬─────┬───────────┬──────────────────────────────────────────────╮
│ id │ name       │ llm │ credit    │ topup                                        │
├────┼────────────┼─────┼───────────┼──────────────────────────────────────────────┤
│ 0  │ deepseek   │ 2   │ $-3.0503  │ https://platform.deepseek.com/usage          │
│ 1  │ moonshot   │ 11  │ $-1.1705  │ https://platform.moonshot.ai/console/account │
│ 2  │ anthropic  │ 9   │ $1.8143   │ https://console.anthropic.com/dashboard      │
│ 3  │ openai     │ 86  │ $-4.1137  │ https://auth.openai.com/log-in               │
│ 4  │ xai        │ 9   │ $-10.6904 │ https://console.x.ai                         │
│ 5  │ gemini     │ 50  │ $-1.7261  │ https://console.cloud.google.com/            │
│ 6  │ mistral    │ 67  │ $0.0000   │ https://console.mistral.ai/home              │
│ 7  │ alibaba    │ 4   │ $0.0000   │ https://bailian.console.alibabacloud.com/    │
│ 8  │ cerebras   │ 10  │ $-0.2826  │ https://huggingface.co/cerebras              │
│ 9  │ nscale     │ 28  │ $0.0000   │ https://huggingface.co/nscale                │
│ 10 │ hyperbolic │ 24  │ $0.0000   │ https://huggingface.co/hyperbolic            │
╰────┴────────────┴─────┴───────────┴──────────────────────────────────────────────╯
````
