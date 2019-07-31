const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytSearch = require('yt-search');
const Discord = require('discord.js');
const Command = require('../system/command');
const Queue = require('./queue');
const Music = require('./music');
const alert = require('../utility/alert');
const config = require('../system/config');
const global = require('../system/global');

/**
 * 
 * @type {Map<String, Queue>}
 */
const queues = new Map()

/**
 * 
 * @param {Command} command
 */
exports.cmd = async function (command) {
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
}

/**
 * 채널에 접속한다.
 * @param {Command} command 
 */
async function join(command) {
    const textChannel = command.msg.channel;
    const voiceChannel = command.msg.member.voiceChannel;

    // 큐가 없다면 새로 생성한다.
    if (!queues.has(command.msg.guild.id)) {
        const queue = new Queue();
        queues.set(command.msg.guild.id, queue);
    }

    // 접속
    await voiceChannel.join();

    const queue = queues.get(command.msg.guild.id);

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
        return alert('OK', `'${voiceChannel.name}' 음성 채널에 접속했습니다.`, command.msg.channel);
    }

    return;
}

/**
 * 채널에서 나간다
 * @param {Command} command 
 */
async function leave(command) {
    const queue = queues.get(command.msg.guild.id);

    // 연결된 음성 채널이 없을 때
    if (!queue || !queue.connected) {
        return alert('ERROR', '현재 음성 채널에 접속되어 있지 않습니다.', command.msg.channel);
    }

    // dispatcher.end() 가 호출되어 오류가 발생하는 것을 방지하기 위해서 음악을 재생중이지 않은 것으로 설정한다.
    queue.playing = false;

    const channelName = queue.guild.voiceConnection.channel.name;

    queue.guild.voiceConnection.disconnect();
    queue.connected = false;

    return alert('OK', `'${channelName}' 음성 채널에서 나갑니다.`, command.msg.channel);
}

/**
 * 
 * @param {Command} command 
 */
async function checkTimeout(command, intervalID) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue || !queue.connected) {
        clearInterval(intervalID);
        if (queue) queue.idle = false;
        return;
    }

    if (queue.playing) {
        queue.idleTime = 0;
    }
    else {
        queue.idleTime += 1;
    }

    if (queue.idleTime >= global.disconnectionTime) {
        alert("WARNING", "자동으로 연결을 종료합니다.", command.msg.channel);
        command.msg.guild.voiceConnection.disconnect();
        clearInterval(intervalID);

        queues.delete(command.msg.guild.id);
        return;
    }
}

/**
 * 
 * @param {Command} command 
 */
async function play(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!command.msg.member.voiceChannel) {
        return alert('ERROR', '음성 채널에 접속해야 사용 할 수 있는 명령어입니다.', command.msg.channel);
    }

    // 음성 채널에 접속한다. 큐가 없으면 새로 생성되고, 있다면 큐의 채널이 갱신된다.
    await join(command);
    queue = queues.get(command.msg.guild.id);

    if (command.args.length > 0) {
        // 유튜브 주소
        if (command.args[0].startsWith('https://')) {
            try {
                if (command.args[0].includes('list=')) {
                    // 플레이리스트
                    await addPlaylist(command, command.args[0]);
                }
                else {
                    // 단일 영상
                    await addMusic(command, command.args[0]);
                }
            }
            catch (e) {
                console.log(e);
                return alert('ERROR', '올바르지 않은 주소입니다.', command.msg.channel);
            }
        }
        // 검색
        else {
            // 인자의 문자열을 합쳐 검색 키워드를 생성한다
            const keyword = command.args.join(' ');

            // 검색
            ytSearch(keyword, function (err, r) {
                if (err) console.log(err);

                const videos = r.videos;

                var text = '아래에서 재생 할 음악을 선택해주세요.\n```asciidoc\n[검색 결과]\n\n';

                for (i = 0; i < 10; i++) {
                    text += `${i + 1} - ${videos[i].title}\n`;
                }

                text += 'c - 취소\n```';

                command.msg.channel.send(text).then((display) => {
                    const filter = (msg) => msg.author.id == command.msg.author.id;
                    command.msg.channel.awaitMessages(filter, { max: 1, time: global.searchTime * 1000 })
                        .then(collected => {
                            const answer = collected.first();
                            var text = answer.content;

                            // 취소
                            if (text === 'c') {
                                answer.delete().then((i) => {
                                    display.delete().then((j) => {
                                        return alert('OK', '검색이 취소되었습니다.', command.msg.channel);
                                    });
                                });
                            }

                            const num = parseInt(text);
                            const url = `https://www.youtube.com${videos[num - 1].url}`;

                            answer.delete();
                            display.delete();

                            addMusic(command, url).then(() => {
                                if (!queue.playing) {
                                    queue.playing = true;
                                    startStream(command.msg.guild, command, queue.musics[0]);
                                }
                            });

                            return;
                        }).catch(err => {
                            display.delete().then((i) => {
                                return alert('ERROR', '검색이 취소되었습니다.', command.msg.channel);
                            });
                        });

                });
            });

            // ytsearch가 비동기적으로 작동하기에 아래 코드가 실행되어서는 안됨.
            return;
        }
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg.channel);
    }

    if (!queue.playing) {
        queue.playing = true;
        return startStream(command.msg.guild, command, queue.musics[0]);
    }
}
/**
 * @param {Discord.Guild} guild
 * @param {Command} command 
 * @param {Music} music
 */
async function startStream(guild, command, music) {
    const queue = queues.get(guild.id);

    // 더 이상 재생 할 음악이 없으면 종료
    if (queue.musics.length == 0) {
        queue.playing = false;

        if (config.noQueueDisconnection) {
            queue.guild.voiceConnection.disconnect();
            queue.connected = false;

            // 해당 서버의 큐를 제거한다
            queues.delete(guild.id);
            return alert('', '모든 음악의 재생을 종료하여 음성 채널에서 나갑니다.', queue.textChannel);
        }

        return;
    }

    const dispatcher = queue.guild.voiceConnection.playStream(ytdl(music.url, { filter: 'audioonly' }))
        .on('start', function () {
            // 음악 재생 시작
            const embed = new Discord.RichEmbed()
                .setTitle(`🎵 다음 음악을 재생합니다 - ${music.title}`)
                .setDescription(`[<@${music.user.id}>]`)
                .setURL(music.url)
                .setColor('#00ccff');
            queue.textChannel.send(embed);
            clearTimeout();
        })
        .on('end', function () {
            // 음악 재생 종료 / 채널에서 나감
            if (queue.playing) {
                // 재생하고 있었던 음악을 저장
                const lastMusic = queue.musics.shift();

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

                startStream(guild, command, queue.musics[0]);
            }
        })
        .on('error', function (err) {
            console.log(err);
        });


    // 뿅
    dispatcher.setVolumeLogarithmic(1 / 5);
}

/**
 * 현재 음악을 스킵한다.
 * @param {Command} command 
 */
async function skip(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    if (!queue.connected) {
        return alert('ERROR', '현재 음성 채널에 접속되어 있지 않습니다.', command.msg.channel);
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg.channel);
    }

    await command.msg.react('✅');

    const embed = new Discord.RichEmbed()
        .setTitle(`🎵 다음 음악이 스킵되었습니다.`)
        .setDescription(`${queue.musics[0].title}`)
        .setColor('#00ccff');
    await command.msg.channel.send(embed);

    queue.guild.voiceConnection.dispatcher.end();

    return;
}

/**
 * 음악을 대기열에 추가한다.
 * @param {Command} command 
 * @param {String} url
 */
async function addMusic(command, url) {
    if (command.msg.member.voiceChannel) {
        const queue = queues.get(command.msg.guild.id);

        const musicInfo = await ytdl.getInfo(url);

        const music = new Music();

        music.title = musicInfo.title;
        music.url = url;
        music.user = command.msg.author;

        queue.musics.push(music);

        const embed = new Discord.RichEmbed()
            .setTitle(`🎵 ${music.title}`)
            .setDescription(`위 음악을 대기열 ${queue.musics.length}번째 위치에 추가했습니다.`)
            .setURL(url)
            .setColor('#00ccff');
        await command.msg.channel.send(embed);
    }
}

/**
 * 재생 목록을 대기열에 추가한다.
 * @param {Command} command 
 * @param {String} url
 */
async function addPlaylist(command, url) {
    const queue = queues.get(command.msg.guild.id);

    const listInfo = await ytpl(url);

    listInfo.items.forEach(function (item) {
        const music = new Music();

        music.title = item.title;
        music.url = item.url_simple;
        music.user = command.msg.author;

        queue.musics.push(music);
    });

    const embed = new Discord.RichEmbed()
        .setTitle(`🎵 ${listInfo.title}`)
        .setDescription(`위 재생 목록을 통해 대기열에 ${listInfo.total_items}개의 음악을 추가했습니다.`)
        .setURL(url)
        .setColor('#00ccff');
    await command.msg.channel.send(embed);
}

/**
 * 
 * @param {Command} command 
 */
async function printQueue(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        await command.msg.channel.send('```asciidoc\n[대기열]\n\n현재 대기열이 존재하지 않습니다.\n```');
        return;
    }

    if (!queue || queue.musics.length == 0) {
        await command.msg.channel.send('```asciidoc\n[대기열]\n\n현재 대기열이 비어있습니다.\n```');
        return;
    }

    var text = '```asciidoc\n[대기열]\n\n';

    for (i = 0; i < queue.musics.length; i++) {
        text += `${i + 1} - ${queue.musics[i].title} - [${queue.musics[i].user.username}]\n`
    }

    text += '```';

    return command.msg.channel.send(text);
}

/**
 * 
 * @param {Command} command 
 */
async function printNowPlaying(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg.channel);
    }

    const music = queue.musics[0];
    const embed = new Discord.RichEmbed()
        .setTitle(`🎵 현재 재생 중인 음악 -  ${music.title}`)
        .setDescription(`[<@${music.user.id}>]`)
        .setURL(music.url)
        .setColor('#00ccff');
    return command.msg.channel.send(embed);
}

/**
 * 
 * @param {Command} command 
 */
async function toggleRepeat(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    queue.repeat = !queue.repeat;

    await command.msg.react('✅');

    if (queue.repeat) {
        return alert('', '반복 재생이 활성화 되었습니다.', command.msg.channel);
    }
    else {
        return alert('', '반복 재생이 비활성화 되었습니다.', command.msg.channel);
    }
}

/**
 * 
 * @param {Command} command 
 */
async function clearMusics(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    var count = queue.musics.length;

    if (command.args.length == 1) {
        count = parseInt(command.args[0]);
    }

    if (count == NaN) {
        return alert('ERROR', '잘못된 명령어입니다.', command.msg.channel);
    }

    if (count > queue.musics.length - 1) {
        count = queue.musics.length - 1;
    }

    if (count < 0) {
        count = 0;
    }

    queue.musics.splice(1, count);

    await command.msg.react('✅');

    return alert('', `대기열에서 ${count}개의 음악이 제거되었습니다.`, command.msg.channel);
}

/**
 * 
 * @param {Command} command 
 */
async function deleteMusic(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    var deleted = 0;
    var musicTitles = '';

    for (i = 0; i < command.args.length; i++) {
        const arg = command.args[i];
        const index = parseInt(arg) - deleted - 1;

        if (index != NaN && index > 0 && index < queue.musics.length) {
            musicTitles += `${queue.musics[index].title}\n`
            queue.musics.splice(index, 1);

            deleted++;
        }
    }

    if (deleted == 0) {
        return alert('ERROR', '잘못된 명령어입니다.', command.msg.channel);
    }

    await command.msg.react('✅');

    const embed = new Discord.RichEmbed()
        .setTitle(`다음 음악이 대기열에서 제거되었습니다.`)
        .setDescription(musicTitles)
    return command.msg.channel.send(embed);
}

/**
 * 
 * @param {Command} command 
 */
async function toggleShuffle(command) {
    const queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    queue.shuffle = !queue.shuffle;

    await command.msg.react('✅');

    if (queue.shuffle) {
        return alert('', '셔플이 활성화 되었습니다.', command.msg.channel);
    }
    else {
        return alert('', '셔플이 비활성화 되었습니다.', command.msg.channel);
    }
}