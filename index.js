const Discord = require('discord.js');
const global = require('./system/global');
const config = require('./system/config');
const Command = require('./system/command');
const router = require('./system/router');
const help = require('./utility/help/help')
const fs = require('fs');
const prompt = require('./bot/prompt')

const client = new Discord.Client();

client.on('ready', function () {
    client.user.setActivity(config.prefix + 'help', { type: "LISTENING" });
    help.init();
    prompt.start();
})

client.on('message', function (msg) {
    var text = msg.content.trim();
    if (text.startsWith(config.prefix)) {
        var command = new Command(msg);
        router.route(command);
    }
});

fs.readFile('token.txt', 'utf-8', function (err, token) {
    if (err) {
        console.log(err);
        return;
    }

    client.login(token.trim());
});
