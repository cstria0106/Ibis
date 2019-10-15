const Discord = require('discord.js');
const config = require('./config');

class Command {
    /**
     *
     * @param {Discord.Message} msg
     */
    constructor(msg) {
        var text = msg.content.trim().substr(config.prefix.length);
        this.type = text.split(' ')[0].toLowerCase();
        this.args = text.split(' ').splice(1);
        this.msg = msg;
    }
}

module.exports = Command;