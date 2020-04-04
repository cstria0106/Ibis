import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import ytSearch from 'yt-search';
import Discord from 'discord.js';
import Command from '../system/Command';
import Queue from './Queue';
import Music from './Music';
import config from '../system/config';
import util from 'util';
import alert, {AlertType} from '../utility/alert';
import Timeout = NodeJS.Timeout;

const queues: { [guildId: string]: Queue } = {};

export default {
	queues: queues,
	async cmd(command: Command) {
		switch (command.type) {
			case 'play':
			case 'p':
				await play(command);
				return;

			case 'skip':
				await skip(command);
				return;

			case 'leave':
				await leave(command);
				return;

			case 'queue':
			case 'q':
				await printQueue(command);
				return;

			case 'nowplaying':
			case 'np':
				await printNowPlaying(command);
				return;

			case 'repeat':
				await toggleRepeat(command);
				return;

			case 'clear':
				await clearMusics(command);
				return;

			case 'delete':
				await deleteMusic(command);
				return;

			case 'shuffle':
				await toggleShuffle(command);
				return;

			case 'join':
				await join(command);
				return;
		}
	},
};

async function join(command: Command) {
	const textChannel = command.msg.channel;
	const voiceChannel = command.msg.member.voice.channel;

	// 큐가 없다면 새로 생성한다.
	if (!queues[command.msg.guild.id]) {
		queues[command.msg.guild.id] = new Queue();
	}

	// 접속
	await voiceChannel.join();

	const queue = queues[command.msg.guild.id];

	queue.connected = true;
	queue.textChannel = textChannel;
	queue.voiceChannel = voiceChannel;
	queue.guild = command.msg.guild;

	queue.idleTime = 0;

	if (!queue.idle) {
		queue.idle = true;
		const id = setInterval(() => {
			return checkTimeout(command, id);
		}, 1000);
	}

	// 명령어가 join 이었다면 메세지를 출력한다.
	if (command.type == 'join') {
		return alert(AlertType.OK, `'${voiceChannel.name}' 음성 채널에 접속했습니다.`, command.msg.channel);
	}

	return;
}

async function leave(command: Command) {
	const queue = queues[command.msg.guild.id];

	// 연결된 음성 채널이 없을 때
	if (!queue || !queue.connected) {
		return alert(AlertType.Error, '현재 음성 채널에 접속되어 있지 않습니다.', command.msg.channel);
	}

	// dispatcher.end() 가 호출되어 오류가 발생하는 것을 방지하기 위해서 음악을 재생중이지 않은 것으로 설정한다.
	queue.playing = false;

	const channelName = queue.guild.voice.connection.channel.name;

	queue.guild.voice.connection.disconnect();
	queue.connected = false;

	return alert(AlertType.OK, `'${channelName}' 음성 채널에서 나갑니다.`, command.msg.channel);
}

async function checkTimeout(command: Command, intervalID: Timeout) {
	const queue = queues[command.msg.guild.id];

	if (!queue || !queue.connected) {
		clearInterval(intervalID);
		if (queue) queue.idle = false;
		return;
	}

	if (queue.playing) {
		queue.idleTime = 0;
	} else {
		queue.idleTime += 1;
	}

	if (queue.idleTime >= config.disconnectionTime) {
		await alert(AlertType.Warning, '자동으로 연결을 종료합니다.', command.msg.channel);
		command.msg.guild.voice.connection.disconnect();
		clearInterval(intervalID);

		delete queues[command.msg.guild.id];
		return;
	}
}

async function play(command: Command) {
	let queue = queues[command.msg.guild.id];

	if (!command.msg.member.voice.channel) {
		return alert(AlertType.Error, '음성 채널에 접속해야 사용 할 수 있는 명령어입니다.', command.msg.channel);
	}

	// 음성 채널에 접속한다. 큐가 없으면 새로 생성되고, 있다면 큐의 채널이 갱신된다.
	try {
		await join(command);
	} catch (e) {
		console.trace(e);
		await alert(AlertType.Error, '보이스 채널에 접속할 수 없습니다.', command.msg.channel);
		return;
	}
	queue = queues[command.msg.guild.id];

	if (command.args.length > 0) {
		// 유튜브 주소
		if (command.args[0].startsWith('https://')) {
			try {
				if (command.args[0].includes('list=')) {
					// 플레이리스트
					try {
						await addPlaylist(command, command.args[0]);
					} catch (e) {
						console.trace(e);
						await alert(AlertType.Error, '플레이 리스트를 추가할 수 없습니다.', command.msg.channel);
						return;
					}
				} else {
					// 단일 영상
					try {
						await addMusic(command, command.args[0]);
					} catch (e) {
						console.trace(e);
						await alert(AlertType.Error, '음악을 추가할 수 없습니다.', command.msg.channel);
						return;
					}
				}
			} catch (e) {
				console.trace(e);
				await alert(AlertType.Error, '올바르지 않은 주소입니다.', command.msg.channel);
				return;
			}
		}
		// 검색
		else {
			// 인자의 문자열을 합쳐 검색 키워드를 생성한다
			const keyword = command.args.join(' ');

			// 검색
			const result = await ytSearch(keyword);
			const videos = result.videos;

			let text = '아래에서 재생 할 음악을 선택해주세요.\n```asciidoc\n[검색 결과]\n\n';

			for (let i = 0; i < 10; i++) {
				text += `${i + 1} - ${videos[i].title}\n`;
			}
			text += 'c - 취소\n```';

			const display = await command.msg.channel.send(text);

			const filter = (msg) => msg.author.id == command.msg.author.id;
			try {
				const collected = await command.msg.channel.awaitMessages(filter, {
					max: 1,
					time: config.searchTime * 1000,
				});
				const answer = collected.first();
				let text = answer.content;

				// 취소
				if (text === 'c') {
					await answer.delete();
					await display.delete();
					return alert(AlertType.OK, '검색이 취소되었습니다.', command.msg.channel);
				}

				const num = parseInt(text);
				const url = videos[num - 1].url;

				await answer.delete();
				await display.delete();
				await addMusic(command, url);

				if (!queue.playing) {
					queue.playing = true;
					await startStream(command.msg.guild, command, queue.musics[0]);
				}
			} catch (e) {
				await display.delete();
			}
		}
	}

	if (queue.musics.length == 0) {
		return alert(AlertType.Error, '현재 대기열이 비어있습니다.', command.msg.channel);
	}

	if (!queue.playing) {
		queue.playing = true;
		return startStream(command.msg.guild, command, queue.musics[0]);
	}
}

async function startStream(guild: Discord.Guild, command: Command, music: Music) {
	const queue = queues[guild.id];

	// 더 이상 재생 할 음악이 없으면 종료
	if (queue.musics.length == 0) {
		queue.playing = false;

		if (config.noQueueDisconnection) {
			queue.guild.voice.connection.disconnect();
			queue.connected = false;

			// 해당 서버의 큐를 제거한다
			delete queues[guild.id];
			return alert(null, '모든 음악의 재생을 종료하여 음성 채널에서 나갑니다.', queue.textChannel);
		}

		return;
	}
	const stream = await ytdl(music.url, {filter: 'audioonly', highWaterMark: 1 << 25});
	
	stream.on('error', (e) => {
		console.trace(e);
	});

	queue.dispatcher = queue.guild.voice.connection.play(stream);

	queue.dispatcher.on('start', async () => {
		// 음악 재생 시작
		const embed = new Discord.MessageEmbed()
			.setTitle(`🎵 다음 음악을 재생합니다 - ${music.title}`)
			.setDescription(`[<@${music.user.id}>]`)
			.setURL(music.url)
			.setColor('#00ccff');
		await queue.textChannel.send(embed);
		clearTimeout();
	});

	queue.dispatcher.on('finish', async () => {
		// 음악 재생 종료 / 채널에서 나감
		if (queue.playing) {
			// 재생하고 있었던 음악을 저장
			const lastMusic = queue.musics.shift();
			queue.dispatcher = null;

			if (queue.repeat) {
				// 반복 재생이 켜져있으면 맨 앞에서 제거한 현재 음악을 다시 뒤에 넣는다.
				queue.musics.push(lastMusic);
			}

			if (queue.shuffle) {
				// 셔플이 켜져있으면 다음 음악을 랜덤으로 골라 대기열의 맨 앞에 넣는다.
				const random = Math.floor(Math.random() * queue.musics.length - 1) + 1;
				const next = queue.musics.splice(random, 1)[0];

				if (next) {
					queue.musics.unshift(next);
				}
			}

			await startStream(guild, command, queue.musics[0]);
		}
	});

	queue.dispatcher.on('error', (e) => {
		console.trace(e);
	});

	// 볼륨 설정
	queue.dispatcher.setVolumeLogarithmic(2 / 5);
}

async function skip(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	if (!queue.connected) {
		return alert(AlertType.Error, '현재 음성 채널에 접속되어 있지 않습니다.', command.msg.channel);
	}

	if (queue.musics.length == 0) {
		return alert(AlertType.Error, '현재 대기열이 비어있습니다.', command.msg.channel);
	}

	try {
		await command.msg.react('✅');
	} catch (e) {
		console.trace(e);
	}

	const embed = new Discord.MessageEmbed()
		.setTitle(`🎵 다음 음악이 스킵되었습니다.`)
		.setDescription(`${queue.musics[0].title}`)
		.setColor('#00ccff');

	try {
		await command.msg.channel.send(embed);
	} catch (e) {
		console.trace(e);
	}

	queue.dispatcher.end();
}

async function addMusic(command: Command, url: string) {
	if (command.msg.member.voice.channel) {
		const queue = queues[command.msg.guild.id];
		let musicInfo: ytdl.videoInfo;

		try {
			musicInfo = await ytdl.getInfo(url);
		} catch (e) {
			console.trace(e);
			await alert(AlertType.Error, '음악 정보를 불러 올 수 없습니다.', command.msg.channel);
			return;
		}

		const music = new Music(musicInfo.title, url, command.msg.author, Number(musicInfo.length_seconds) * 1000);
		queue.musics.push(music);

		const embed = new Discord.MessageEmbed()
			.setTitle(`🎵 ${music.title}`)
			.setDescription(`위 음악을 대기열 ${queue.musics.length}번째 위치에 추가했습니다.`)
			.setURL(url)
			.setColor('#00ccff');
		try {
			await command.msg.channel.send(embed);
		} catch (e) {
			console.trace(e);
		}
	}
}

async function addPlaylist(command: Command, url: string) {
	const queue = queues[command.msg.guild.id];

	let listInfo;

	try {
		listInfo = await ytpl(url, {limit: 0});
	} catch (e) {
		console.trace(e);
		await alert(AlertType.Error, '플레이 리스트를 불러 올 수 없습니다.', command.msg.channel);
		return;
	}

	listInfo.items.forEach(function (item) {
		const timestring = item.duration.split(':');
		const minute = Number(timestring[0]);
		const second = Number(timestring[1]);
		const music = new Music(item.title, item.url_simple, command.msg.author, (minute * 60 + second) * 1000);

		queue.musics.push(music);
	});

	const embed = new Discord.MessageEmbed()
		.setTitle(`🎵 ${listInfo.title}`)
		.setDescription(`위 재생 목록을 통해 대기열에 ${listInfo.total_items}개의 음악을 추가했습니다.`)
		.setURL(url)
		.setColor('#00ccff');
	try {
		await command.msg.channel.send(embed);
	} catch (e) {
		console.trace(e);
	}
}

async function printQueue(command: Command) {
	const queue = queues[command.msg.guild.id];
	const paging = 20;
	const maxPage = Math.ceil(queue.musics.length / paging);
	var page = Number(command.args[0]) || 1;
	if (page > maxPage) page = maxPage;
	if (page < 1) page = 1;

	try {
		if (!queue) {
			await command.msg.channel.send('```asciidoc\n[대기열]\n\n현재 대기열이 존재하지 않습니다.\n```');
			return;
		}

		if (!queue || queue.musics.length == 0) {
			await command.msg.channel.send('```asciidoc\n[대기열]\n\n현재 대기열이 비어있습니다.\n```');
			return;
		}
	} catch (e) {
		console.trace(e);
	}

	let text = `\`\`\`asciidoc\n[대기열 ${page}/${maxPage}]\n\n`;

	for (let i = paging * (page - 1); i < paging * page && i < queue.musics.length; i++) {
		text += `${i + 1} - ${queue.musics[i].title} - [${queue.musics[i].user.username}]\n`;
	}

	text += '```';

	return command.msg.channel.send(text);
}

async function printNowPlaying(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	if (queue.musics.length == 0) {
		return alert(AlertType.Error, '현재 대기열이 비어있습니다.', command.msg.channel);
	}

	const music = queue.musics[0];
	const embed = new Discord.MessageEmbed()
		.setTitle(`🎵 현재 재생 중인 음악 -  ${music.title}`)
		.setDescription(`${getTimeString(queue.dispatcher.streamTime)} / ${getTimeString(music.time)}\n[<@${music.user.id}>]`)
		.setURL(music.url)
		.setColor('#00ccff');
	return command.msg.channel.send(embed);
}

function getTimeString(ms: number) {
	let time = Math.floor(ms / 1000);
	let minute = Math.floor(time / 60);
	let second = (time - 60 * minute).toString();

	if (second.length == 1) second = '0' + second;

	return util.format('%s:%s', minute, second);
}

async function toggleRepeat(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	queue.repeat = !queue.repeat;

	try {
		await command.msg.react('✅');
	} catch (e) {
		console.trace(e);
	}

	if (queue.repeat) {
		return alert(null, '반복 재생이 활성화 되었습니다.', command.msg.channel);
	} else {
		return alert(null, '반복 재생이 비활성화 되었습니다.', command.msg.channel);
	}
}

async function clearMusics(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	var count = queue.musics.length;

	if (command.args.length == 1) {
		count = parseInt(command.args[0]);
	}

	if (isNaN(count)) {
		return alert(AlertType.Error, '잘못된 명령어입니다.', command.msg.channel);
	}

	if (count > queue.musics.length - 1) {
		count = queue.musics.length - 1;
	}

	if (count < 0) {
		count = 0;
	}

	queue.musics.splice(1, count);

	try {
		await command.msg.react('✅');
	} catch (e) {
		console.trace(e);
	}

	return alert(null, `대기열에서 ${count}개의 음악이 제거되었습니다.`, command.msg.channel);
}

async function deleteMusic(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	let deleted = 0;
	let musicTitles = '';

	for (let i = 0; i < command.args.length; i++) {
		const arg = command.args[i];
		const index = parseInt(arg) - deleted - 1;

		if (!isNaN(index) && index > 0 && index < queue.musics.length) {
			musicTitles += `${queue.musics[index].title}\n`;
			queue.musics.splice(index, 1);

			deleted++;
		}
	}

	if (deleted == 0) {
		return alert(AlertType.Error, '잘못된 명령어입니다.', command.msg.channel);
	}

	try {
		await command.msg.react('✅');
	} catch (e) {
		console.trace(e);
	}

	const embed = new Discord.MessageEmbed()
		.setTitle(`다음 음악이 대기열에서 제거되었습니다.`)
		.setDescription(musicTitles);
	return command.msg.channel.send(embed);
}

async function toggleShuffle(command: Command) {
	const queue = queues[command.msg.guild.id];

	if (!queue) {
		return alert(AlertType.Error, '현재 대기열이 존재하지 않습니다.', command.msg.channel);
	}

	queue.shuffle = !queue.shuffle;

	try {
		await command.msg.react('✅');
	} catch (e) {
		console.trace(e);
	}

	if (queue.shuffle) {
		return alert(null, '셔플이 활성화 되었습니다.', command.msg.channel);
	} else {
		return alert(null, '셔플이 비활성화 되었습니다.', command.msg.channel);
	}
}
