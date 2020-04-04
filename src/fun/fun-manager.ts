import Command from '../system/Command';
import cat from './cat';
import dog from './dog';

export default {
	async cmd(command: Command) {
		switch (command.type) {
			case 'cat':
				await cat(command);
				break;
			case 'dog':
				await dog(command);
				break;
		}
	},
};