const Discord = require('discord.js');
const global = require('./system/global');
const config = require('./system/config');
const musicManager = require('./music/music-manager');
const Command = require('./system/command');
const router = require('./system/router');
const help = require('./utility/help/help')

const client = new Discord.Client();

client.on('ready', function () {
    client.user.setActivity(config.prefix + 'help', { type: "LISTENING" });
    help.init();
})

client.on('message', function (msg) {
    var text = msg.content.trim();
    if (text.startsWith(config.prefix)) {
        var command = new Command(msg);
        router.route(command);
    }
});

client.login(global.token);