const readline = require('readline');
const musicmanager = require('../music/music-manager');
const Discord = require('discord.js');

module.exports.start = function () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('');
    rl.prompt();

    rl.on('line', function (line) {
        if (line.length > 0) {
            musicmanager.queues.forEach(function (queue) {
                const embed = new Discord.RichEmbed()
                    .setTitle(`${line}`);
                queue.textChannel.sendMessage(embed);
            });
        }
    });
}