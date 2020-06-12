import request from 'request-promise';
import alert, { AlertType } from '../utility/alert';
import Command from '../system/Command';

export default async function (command: Command) {
	const url = 'https://dog.ceo/api/breeds/image/random';

	try {
		const res = JSON.parse(await request(url));

		if (res.status === 'success') {
			await command.msg.reply({
				files: [
					res.message,
				],
			});
		} else {
			return alert(AlertType.Error, '명령을 처리할 수 없습니다.', command.msg.channel);
		}
	} catch (e) {
		console.log(e);
		return alert(AlertType.Error, '명령을 처리할 수 없습니다.', command.msg.channel);
	}
};