it's discord week

In a newly created sandbox sloppy is this morning 180 lines of deno.


# models under test

# code under observation

## sloppy.ts code review of a deno utility 

August 2025 was going to be private repos with venture capital pitch decks flowing with enthusiasm.

Huh.

Instead the path of least resistance lays down for the keep it simple stupids and preambles with MIT license move us along.

```
// sloppy.ts - a research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

const quotes=[
	"🤖 I am sloppy the janitor",
	"did thing thing call for a plunge? 🪠",
	"frump system prompt you say?"
];
````

## the promise race

As we progress into more complex connections, we meet the race condition.

POSIX programmers will know it as the select statement.

https://man7.org/linux/man-pages/man2/select.2.html

In modern javascript we meet the promise race.

Here is the main loop of our discord spawning command line utility.

```
let portPromise=readFountain();
let systemPromise=readSystem();
while(true){
	const race=[portPromise,systemPromise];
	const result=await Promise.race(race);
	if (result==null) break;
	if(result.system) {
		onSystem(result.system);
		systemPromise=readSystem();
	}
	if(result.message) {
		onResult(result.message);
		portPromise=readFountain();		
	}
//	echo("result",result);
	await(sleep(500));
}
```

There is alternative ways to service each service. 


As an amateur who has only typed await Promise.race very recently this is all of course a learning journey, not an exercise in best practice carry on.