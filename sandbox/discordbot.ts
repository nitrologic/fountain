// slopchat.ts - A research tool connecting large language models.
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

console.log("[SLOPPY] slopchat discord bot by simon 0.02");

let quoteCount=0;

const quotes=[
	"Science isn't about why it's about why not.",
	"The Enrichment Center is required to remind you that you will be baked, and then there will be cake.",
	"Just a heads up: We're gonna have a superconductor turned up full blast and pointed at you for the duration of this next test.",
	"Are you still there?"
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
//	console.log("[SLOPPY] channels",client.channels);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;
	if (message.content === '!ping') {
		message.reply('pong!');
		console.log("[SLOPPY]","pong!")
//		const list=await listChannels(message);
//		console.log("[SLOPPY]",list);
	}
    if (message.mentions.has(client.user) && !message.author.bot) {
		const from=message.author.username;	//skudmarks
		const name=message.author.displayName;
		const quote=quotes[quoteCount++%quotes.length];
        message.reply("hello "+name+".\n"+quote);
    }
});

async function listChannels(message) {
	if (!message.guild) return "This command only works in servers";
	const channels = message.guild.channels.cache
		.filter(channel => channel.isTextBased())
		.map(channel => `#${channel.name}`)
		.join('\n');
	return channels || 'No text channels found';
}

const token=Deno.env.get("DISCORD_BOT");
client.login(token)
