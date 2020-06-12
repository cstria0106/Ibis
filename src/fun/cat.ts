import request from 'request-promise';
import alert, { AlertType } from '../utility/alert';
import Command from '../system/Command';

export default async function (command: Command) {
	const url = 'https://api.thecatapi.com/v1/images/search';

	try {
		const res = JSON.parse(await request(url));

		if (res.length > 0) {
			await command.msg.reply({
				files: [
					res[0].url,
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