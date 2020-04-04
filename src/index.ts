import 'source-map-support/register';
import Discord from 'discord.js';
import Command from './system/Command';
import prompt from './bot/prompt';
import config from './system/config';
import dotenv from 'dotenv';
import * as router from './system/router';
import help from './utility/help';

async function main() {
	dotenv.config();
	const client = new Discord.Client();

	client.on('ready', async () => {
		console.log("봇이 제대로 작동하고 있습니다!");
		await client.user.setActivity(config.prefix + 'help', {type: "LISTENING"});
		await help.init();
		await prompt.start();
	});

	client.on('message', async (msg) => {
		let text = msg.content.trim();
		if (text.startsWith(config.prefix)) {
			let command = new Command(msg);
			await router.route(command);
		}
	});

	if (config.token) {
		await client.login(config.token);
	} else {
		console.log("토큰이 없습니다.");
	}
}

main().then();