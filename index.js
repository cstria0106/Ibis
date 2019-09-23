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
    console.log("봇이 제대로 작동하고 있습니다!");
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

// node . <TOKEN> <PREFIX>

if (process.argv.length > 2) {
    client.login(process.argv[2].trim());

    // PREFIX 설정
    if (process.argv.length > 3) {
        config.prefix = process.argv[3];
    }
}
else {
    console.log("토큰이 없습니다.");
    return;
}
