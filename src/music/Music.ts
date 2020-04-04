import Discord from 'discord.js';

export default class Music {
	public title: string;
	public url: string;
	public user: Discord.User;
	public time: number;

	constructor(title: string, url: string, user: Discord.User, time: number) {
		this.title = title;
		this.url = url;
		this.user = user;
		this.time = time;
	}
}