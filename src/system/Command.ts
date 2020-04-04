import config from './config';
import Discord from 'discord.js';

export default class Command {
	public type: string;
	public args: string[];
	public msg: Discord.Message;

	constructor(msg: Discord.Message) {
		let text = msg.content.trim().substr(config.prefix.length);
		this.type = text.split(' ')[0].toLowerCase();
		this.args = text.split(' ').splice(1);
		this.msg = msg;
	}
}