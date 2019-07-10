const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytSearch = require('yt-search');
const Discord = require('discord.js');
const Command = require('../system/command');
const Queue = require('./queue');
const Music = require('./music');
const alert = require('../utility/alert');

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
    command.msg.guild.id

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
 * 채널에 접속하고 해당 서버의 큐를 생성한다
 * @param {Command} command 
 */
async function join(command) {
    var textChannel = command.msg.channel;
    var voiceChannel = command.msg.member.voiceChannel;

    if (!queue) {
        var queue = new Queue(textChannel, voiceChannel, command.msg.guild);
        await voiceChannel.join();
        queue.connected = true;

        queues.set(command.msg.guild.id, queue);
    }
    else {
        await voiceChannel.join();
        queues.get(command.msg.guild.id).connected = true;
    }

    return queue;
}

/**
 * 채널에서 나간다
 * @param {Command} command 
 */
async function leave(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
    }

    if (!queue.connected) {
        return alert('ERROR', '현재 음성 채널에 접속되어 있지 않습니다.', command.msg);
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg);
    }

    queue.playing = false;

    queue.guild.voiceConnection.disconnect();
    queue.connected = false;

    return alert('OK', '음성 채널에서 나갑니다.', command.msg);
}

/**
 * 
 * @param {Command} command 
 */
async function play(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!command.msg.member.voiceChannel) {
        return alert('ERROR', '음성 채널에 접속해야 사용 할 수 있는 명령어입니다.', command.msg);
    }

    // 큐가 없으면 새로 구성
    if (!queue) {
        queue = await join(command);
    }
    else {
        queue.voiceChannel = command.msg.member.voiceChannel;
        queue.textChannel = command.msg.channel;
        await queue.voiceChannel.join();

        queue.connected = true;
    }

    if (command.args.length > 0) {
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
                return alert('ERROR', '올바르지 않은 주소입니다.', command.msg);
            }
        }
        else {
            var keyword = command.args.join(' ');

            ytSearch(keyword, function (err, r) {
                if (err) console.log(err);

                const videos = r.videos;

                var text = '아래에서 재생 할 음악을 선택해주세요.\n```asciidoc\n[검색 결과]\n\n';

                for (i = 0; i < 10; i++) {
                    text += `${i + 1} - ${videos[i].title}\n`;
                }

                text += 'c - 취소\n```';

                var display = null;
                command.msg.channel.send(text).then((m) => {
                    var display = m;

                    const filter = (msg) => msg.author.id == command.msg.author.id;
                    command.msg.channel.awaitMessages(filter, { max: 1, time: 10000 })
                        .then(collected => {
                            var text = collected.first().content;
                            if (text === 'c') {
                                collected.first().delete();
                                display.delete();
                                return alert('OK', '검색이 취소되었습니다.', command.msg);
                            }

                            var num = parseInt(text);
                            var url = `https://www.youtube.com${videos[num - 1].url}`;

                            collected.first().delete();
                            display.delete();

                            addMusic(command, url).then(() => {
                                if (!queue.playing) {
                                    queue.playing = true;
                                    startStream(command.msg.guild, command, queue.musics[0]);
                                }
                            });

                            return;
                        }).catch(err => {
                            return alert('ERROR', '검색이 취소되었습니다.', command.msg);
                        });

                });
            });

            return;
        }
    }

    if (queue.musics.length == 0) {
        if (queue.musics.length == 0) {
            return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg);
        }
    }

    if (!queue.playing) {
        queue.playing = true;
        startStream(command.msg.guild, command, queue.musics[0]);
    }
}
/**
 * @param {Discord.Guild} guild
 * @param {Command} command 
 * @param {Music} music
 */
async function startStream(guild, command, music) {
    var queue = queues.get(guild.id);

    if (queue.musics.length == 0) {
        queue.playing = false;
        queue.connected = false;
        queue.guild.voiceConnection.disconnect();
        queues.delete(guild);

        return alert('', '모든 음악의 재생을 종료하여 음성 채널에서 나갑니다.', queue.textChannel);
    }

    const dispatcher = queue.guild.voiceConnection.playStream(ytdl(music.url, { filter: 'audioonly' }))
        .on('start', function () {
            const embed = new Discord.RichEmbed()
                .setTitle(`🎵 다음 음악을 재생합니다 - ${music.title}`)
                .setDescription(`[<@${music.user.id}>]`)
                .setURL(music.url)
                .setColor('#00ccff');
            queue.textChannel.send(embed);
        })
        .on('end', function () {
            if (queue.playing) {
                var music = null;

                music = queue.musics.shift();

                if (shuffle) {
                    var random = Math.floor(Math.random() * queue.musics.length - 1) + 1;
                    var next = queue.musics.splice(next, 1)[0];
                    queue.musics.unshift(next);
                }

                if (queue.repeat) {
                    queue.musics.push(music);
                }

                startStream(guild, command, queue.musics[0]);
            }
        })
        .on('error', function (err) {
            console.log(err);
        });

    dispatcher.setVolumeLogarithmic(1 / 5);
}

/**
 * 
 * @param {Command} command 
 */
async function skip(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
    }

    if (!queue.connected) {
        return alert('ERROR', '현재 음성 채널에 접속되어 있지 않습니다.', command.msg);
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg);
    }

    await command.msg.react('✅');

    const embed = new Discord.RichEmbed()
        .setTitle(`다음 음악이 스킵되었습니다.`)
        .setDescription(`${queue.musics[0].title}`)
    await command.msg.channel.send(embed);

    queue.guild.voiceConnection.dispatcher.end();

    return;
}

/**
 * 
 * @param {Command} command 
 * @param {String} url
 */
async function addMusic(command, url) {
    if (command.msg.member.voiceChannel) {
        var queue = queues.get(command.msg.guild.id);

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
 * 
 * @param {Command} command 
 * @param {String} url
 */
async function addPlaylist(command, url) {
    var queue = queues.get(command.msg.guild.id);

    var listInfo = await ytpl(url);

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
    var queue = queues.get(command.msg.guild.id);

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
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg.channel);
    }

    if (queue.musics.length == 0) {
        return alert('ERROR', '현재 대기열이 비어있습니다.', command.msg.channel);
    }

    var music = queue.musics[0];
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
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
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
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
    }

    var count = queue.musics.length;

    if (command.args.length == 1) {
        count = parseInt(command.args[0]);
    }

    if (count == NaN) {
        return alert('ERROR', '잘못된 명령어입니다.', command.msg);
    }

    queue.musics.splice(0, count);

    await command.msg.react('✅');

    return alert('', `대기열에서 ${count}개의 음악이 제거되었습니다.`, command.msg.channel);
}

/**
 * 
 * @param {Command} command 
 */
async function deleteMusic(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
    }

    var deleted = 0;
    var musicTitles = '';

    for (i = 0; i < command.args.length; i++) {
        var arg = command.args[i];
        var index = parseInt(element) - deleted - 1;

        if (index != NaN || index < 2 || index > queue.musics.length) {
            musicTitles += `${queue.musics[i].title}\n`
            deleted++;
            queue.musics.splice(index - 1, 1);
        }
    }

    if (deleted == 0) {
        return alert('ERROR', '잘못된 명령어입니다.', command.msg);
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
    var queue = queues.get(command.msg.guild.id);

    if (!queue) {
        return alert('ERROR', '현재 대기열이 존재하지 않습니다.', command.msg);
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