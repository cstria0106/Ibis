import Discord from 'discord.js';
import musicManager from '../music/music-manager';
import readline from 'readline';

export default {
	async start() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.setPrompt('');
		rl.prompt();

		rl.on('line', async (line) => {
			if (line.length > 0) {
				for (let key in musicManager.queues) {
					const queue = musicManager.queues[key];
					const embed = new Discord.MessageEmbed()
						.setTitle(`${line}`);
					await queue.textChannel.send(embed);
				}
			}
		});
	},
};