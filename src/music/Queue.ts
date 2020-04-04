import Discord, {DMChannel, NewsChannel, TextChannel} from 'discord.js';
import Music from './Music';

export default class Queue {
	public playing = false;
	public connected = false;
	public idle = false;
	public idleTime = 0;
	public repeat = false;
	public shuffle = false;
	public textChannel: TextChannel | DMChannel | NewsChannel = null;
	public voiceChannel: Discord.VoiceChannel = null;
	public guild: Discord.Guild = null;
	public musics: Music[] = [];
	public dispatcher: Discord.StreamDispatcher = null;
}