const Discord = require('discord.js');
const Command = require('./system/command');
const router = require('./system/router');
const help = require('./utility/help/help');
const prompt = require('./bot/prompt');
const config = require('./system/config');
const dotenv = require('dotenv');

dotenv.config();

const client = new Discord.Client();

client.on('ready', function () {
    console.log("봇이 제대로 작동하고 있습니다!");
    client.user.setActivity(config.prefix + 'help', { type: "LISTENING" });
    help.init();
    prompt.start();
});

client.on('message', async function (msg) {
    var text = msg.content.trim();
    if (text.startsWith(config.prefix)) {
        var command = new Command(msg);
        await router.route(command);
    }
});

if (config.token) {
    client.login(config.token);
}
else {
    console.log("토큰이 없습니다.");
    return;
}
