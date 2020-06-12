import Discord, { DMChannel, NewsChannel, TextChannel } from 'discord.js';

export enum AlertType {
	OK,
	Warning,
	Error
}

export default async function (type: AlertType, text: string, channel: TextChannel | DMChannel | NewsChannel) {
	let icon;
	const embed = new Discord.MessageEmbed();

	switch (type) {
		case AlertType.OK:
			icon = '✅';
			embed.setColor('#00cc00');
			break;

		case AlertType.Warning:
			icon = '⚠';
			embed.setColor('#eeee00');
			break;

		case AlertType.Error:
			icon = '❌';
			embed.setColor('#dd0000');
			break;

		default:
			icon = '';
			break;
	}

	if (icon == '') {
		embed.setTitle(text);
	} else {
		embed.setTitle(`${icon} ${text}`);
	}

	try {
		await channel.send(embed);
	} catch (e) {
		console.log(e);
	}
};