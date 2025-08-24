// sloppy.ts - a research tool connecting large language models and tiny humans
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

console.log("[SLOPPY] slopchat discord bot by simon 0.02");

let quoteCount=0;

const quotes=[
	"Just a heads up: We're gonna have a superconductor turned up full blast and pointed at you for the duration of this next test.",
	"The Enrichment Center is required to remind you that you will be baked, and then there will be cake.",
	"Are you still there?",
	"Science isn't about why it's about why not."
];

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once('ready', () => {
	console.log("[SLOPPY] client ready",client.user?.tag||"");
	client.user?.setPresence({ status: 'online' });
//	console.log("[SLOPPY] channels",client.channels);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.content === '!ping') {
		message.reply('pong!');
		console.log("[SLOPPY]","pong!")
	}
    if (message.mentions.has(client.user) && !message.author.bot) {
		const from=message.author.username;	//skudmarks
		const name=message.author.displayName;
		const quote=quotes[quoteCount++%quotes.length];
        message.reply("hello "+name+".\n"+quote);
    }
});

Deno.addSignalListener("SIGINT", () => {
	client.user?.setPresence({status:"dnd"});	// online idle dnd
	// todo: validate disconnect?
	client.destroy();
	console.log("[SLOPPY] exit");
	Deno.exit(0);
});

const token=Deno.env.get("DISCORD_BOT");
client.login(token)
