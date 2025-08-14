[![Deno](https://img.shields.io/badge/deno-2.4.2-black?logo=deno)](https://deno.land/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

# ꕶLOP Fountain ⛲

Home of nitrologic slop fountain — the 4th generation roha foundry forge LLM tool.

Exposing 297 models from 11 providers the research project Fountain 1.3.8 ⛲ approaches interesting.

> maximum prompt length exceeded - every model ever

## Researcher Links

* [fountain.md](roha/fountain.md) Configuration
* [forge.md](roha/forge.md) Command Set
* [plan.txt](roha/plan.txt) On the list
* [license](LICENSE) Copyright (c) 2025 Simon Armstrong - MIT License

# blog posts

* [blog slops](slop\blog2\blogust.md)
* [blog-fountain](slop/blog/blogfountain.md) recent fountain models under test
* [blog-forge](https://github.com/nitrologic/forge/blob/main/blog.md) archived forge model under test

## Developer setup

Install [Deno 2.4.2](https://deno.com/)

## Example output

> /account
```
┌────┬────────────┬─────┬──────────┬──────────────────────────────────────────────┐
│ id │ name       │ llm │ credit   │ topup                                        │
├────┼────────────┼─────┼──────────┼──────────────────────────────────────────────┤
│ 0  │ deepseek   │ 2   │ $-1.3482 │ https://platform.deepseek.com/usage          │
│ 1  │ moonshot   │ 11  │ $-0.9066 │ https://platform.moonshot.ai/console/account │
│ 2  │ anthropic  │ 9   │ $1.8143  │ https://console.anthropic.com/dashboard      │
│ 3  │ openai     │ 86  │ $-2.9422 │ https://auth.openai.com/log-in               │
│ 4  │ xai        │ 8   │ $-9.1530 │ https://console.x.ai                         │
│ 5  │ gemini     │ 50  │ $-1.7031 │ https://console.cloud.google.com/            │
│ 6  │ mistral    │ 67  │ $0.0000  │ https://console.mistral.ai/home              │
│ 7  │ alibaba    │ 4   │ $0.0000  │ https://bailian.console.alibabacloud.com/    │
│ 8  │ cerebras   │ 10  │ $-0.2826 │ https://huggingface.co/cerebras              │
│ 9  │ nscale     │ 28  │ $0.0000  │ https://huggingface.co/nscale                │
│ 10 │ hyperbolic │ 22  │ $0.0000  │ https://huggingface.co/hyperbolic            │
└────┴────────────┴─────┴──────────┴──────────────────────────────────────────────┘
````
