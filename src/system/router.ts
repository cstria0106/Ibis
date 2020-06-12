import Command from './Command';
import musicManager from '../music/music-manager';
import funManager from '../fun/fun-manager';
import help from '../utility/help';

export async function route(command: Command) {
	try {
		switch (command.type) {
			case 'play':
			case 'p':
			case 'skip':
			case 'leave':
			case 'queue':
			case 'q':
			case 'nowplaying':
			case 'np':
			case 'repeat':
			case 'clear':
			case 'delete':
			case 'shuffle':
			case 'join':
				await musicManager.cmd(command);
				break;
			case 'help':
				await help.cmd(command);
				break;
			case 'dog':
			case 'cat':
				await funManager.cmd(command);
				break;
		}
	} catch (e) {
		console.log(e);
		return;
	}
}