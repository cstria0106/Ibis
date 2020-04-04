import Command from '../system/Command';
import fs from 'fs';
import Discord from 'discord.js';
import alert, {AlertType} from './alert';
import config from '../system/config';

let commands;

export default {
	async init() {
		const json = await fs.promises.readFile('commands.json', 'utf8');
		commands = JSON.parse(json);
	},
	async cmd(command: Command) {
		if (command.args.length == 0) {
			// 명령어 목록
			const embed = new Discord.MessageEmbed();
			embed.setDescription(`명령어 목록은 다음과 같습니다.\n\`${config.prefix}help <명령어>\`를 통해 자세한 설명을 볼 수 있습니다.`);
			embed.setColor('#00ccff');

			for (let set of commands) {
				const list = set.list;

				let value = '';
				for (let element of list) {
					value += `\`${config.prefix}${element.name.split('|')[0]}\`\n`;
				}

				const name = set.category;
				embed.addField(name, value, true);
			}

			await command.msg.channel.send(embed);
			return;
		} else if (command.args.length == 1) {
			// 명령어 설명
			const embed = new Discord.MessageEmbed();

			let cmd = null;

			for (let set of commands) {
				set.list.some(element => {
					if (element.name.split('|').includes(command.args[0])) cmd = element;
					return cmd != null;
				});
			}

			if (!cmd) {
				return alert(AlertType.Error, '해당하는 명령어가 없습니다.', command.msg.channel);
			}

			embed.setTitle(`${config.prefix}${cmd.name.split('|')[0]}`);
			embed.setDescription(cmd.description);
			embed.addField('사용법', `\`${config.prefix}${cmd.usage}\``, true);
			embed.setColor('#00ccff');

			if (cmd.examples.length > 0) {
				let exampleText = '';

				cmd.examples.forEach(example => {
					exampleText += `\`${config.prefix}${example.command}\` - ${example.description}\n`;
				});
				embed.addField('예시', exampleText, false);
			}

			await command.msg.channel.send(embed);
		} else {
			return alert(AlertType.Error, '잘못된 명령어입니다.', command.msg.channel);
		}
	},
};