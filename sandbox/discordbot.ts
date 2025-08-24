// slopchat.ts - A research tool connecting large language models.
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { Client, GatewayIntentBits } from "npm:discord.js@14.14.1";

console.log("[SLOPPY] slopchat discord bot by simon 0.02");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once('ready', () => {
	console.log("[SLOPPY] client ready",client.user?.tag||"");
});

client.on('messageCreate', (message) => {
	if (message.author.bot) return;
	if (message.content === '!ping') {
		message.reply('pong!');
		console.log("[SLOPPY]","pong!")
	}
});

const token=Deno.env.get("DISCORD_BOT");
client.login(token)
