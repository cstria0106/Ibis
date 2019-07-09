const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytSearch = require('yt-search');
const Discord = require('discord.js');
const Command = require('./command');
const Queue = require('./queue');
const Music = require('./music');

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
            await command.msg.delete();
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
            await command.msg.delete();
            return;

        case 'nowplaying':
        case 'np':
            await printNowPlaying(command);
            await command.msg.delete();
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

    var queue = new Queue(textChannel, voiceChannel, command.msg.guild);
    await voiceChannel.join();
    queue.connected = true;

    queues.set(command.msg.guild.id, queue);

    return queue;
}

/**
 * 채널에서 나간다
 * @param {Command} command 
 */
async function leave(command) {
    if (!queue || !queue.connected) {
        const embed = new Discord.RichEmbed()
            .setTitle(`❌ 현재 음성 채널에 접속되어 있지 않습니다.`)
        await command.msg.channel.send(embed);
        return;
    }

    var queue = queues.get(command.msg.guild.id);
    queue.playing = false;

    queue.guild.voiceConnection.disconnect();
    queue.connected = false;

    const embed = new Discord.RichEmbed()
        .setTitle(`음성 채널에서 나갑니다.`)
    await command.msg.channel.send(embed);
}

/**
 * 
 * @param {Command} command 
 */
async function play(command) {
    var queue = queues.get(command.msg.guild.id);

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
            catch{
                const embed = new Discord.RichEmbed()
                    .setTitle(`❌ 올바르지 않은 주소입니다.`)
                await command.msg.channel.send(embed);

                return;
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
                                return command.msg.channel.send('✅ 검색이 취소 되었습니다.');
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
                            const embed = new Discord.RichEmbed()
                                .setTitle(`❌ 검색이 취소 되었습니다.`)
                            return command.msg.channel.send(embed);
                        });

                });
            });

            return;
        }
    }

    if (queue.musics.length == 0) {
        const embed = new Discord.RichEmbed()
            .setTitle(`❌ 현재 대기열이 비어있습니다.`)
        await command.msg.channel.send(embed);
    }
    else {
        if (!queue.playing) {
            queue.playing = true;
            startStream(command.msg.guild, command, queue.musics[0]);
        }
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

        const embed = new Discord.RichEmbed()
            .setTitle(`모든 음악의 재생을 종료하여 음성 채널에서 나갑니다.`)
        await command.msg.channel.send(embed);

        return;
    }

    const dispatcher = queue.guild.voiceConnection.playStream(ytdl(music.url, { filter: 'audioonly' }))
        .on('start', function () {
            const embed = new Discord.RichEmbed()
                .setTitle(`🎵 다음 음악을 재생합니다 - ${music.title}`)
                .setDescription(`[<@${music.user.id}>]`)
                .setURL(music.url);
            command.msg.channel.send(embed);
        })
        .on('end', function () {
            if (queue.playing) {
                queue.musics.shift();
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

    if (queue && queue.musics.length > 0) {
        if (!queue.connected) {
            const embed = new Discord.RichEmbed()
                .setTitle(`❌ 현재 음악을 재생하고 있지 않습니다.`)
            await command.msg.channel.send(embed);
        }
        else {
            await command.msg.react('✅');
            const embed = new Discord.RichEmbed()
                .setTitle(`다음 음악이 스킵되었습니다.`)
                .setDescription(`${queue.musics[0].title}`)
            await command.msg.channel.send(embed);


            queue.guild.voiceConnection.dispatcher.end();
        }
    }
    else {
        const embed = new Discord.RichEmbed()
            .setTitle(`❌ 현재 대기열이 비어있습니다.`)
        await command.msg.channel.send(embed);
    }
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
            .setDescription(`위 음악을 재생목록에 추가했습니다.`)
            .setURL(url);
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
        .setURL(url);
    await command.msg.channel.send(embed);
}

/**
 * 
 * @param {Command} command 
 */
async function printQueue(command) {
    var queue = queues.get(command.msg.guild.id);

    if (!queue || queue.musics.length == 0) {
        await command.msg.channel.send('```asciidoc\n[대기열]\n\n현재 대기열이 비어있습니다.\n```');
        return;
    }

    var text = '```asciidoc\n[대기열]\n\n';

    for (i = 0; i < queue.musics.length; i++) {
        text += `${i + 1} - ${queue.musics[i].title} - [${queue.musics[i].user.username}]\n`
    }

    text += '```';

    await command.msg.channel.send(text);
}

async function printNowPlaying(command) {
    var queue = queues.get(command.msg.guild.id);

    if (queue && queue.playing && queue.musics.length > 0) {
        var music = queue.musics[0];
        const embed = new Discord.RichEmbed()
            .setTitle(`🎵 현재 재생 중인 음악 -  ${music.title}`)
            .setDescription(`[<@${music.user.id}>]`)
            .setURL(music.url);
        await command.msg.channel.send(embed);
    }
    else {
        const embed = new Discord.RichEmbed()
            .setTitle(`❌ 현재 음악을 재생하고 있지 않습니다.`)
        await command.msg.channel.send(embed);
    }

}
