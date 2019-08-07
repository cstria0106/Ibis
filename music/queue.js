const Discord = require('discord.js');
const Music = require('./music');

class Queue {
    constructor() {
        this.playing = false;
        this.connected = false;

        this.idle = false;
        this.idleTime = 0;

        this.repeat = false;
        this.shuffle = false;

        /**
         * @type {Discord.TextChannel}
         */
        this.textChannel = null;

        /**
         * @type {Discord.VoiceChannel}
         */
        this.voiceChannel = null;

        /**
         * @type {Discord.Guild}
         */
        this.guild = null;

        /**
         * @type {Music[]}
         */
        this.musics = [];

        /**
         * @type {Discord.StreamDispatcher}
         */
        this.stream = null;
    }
}

module.exports = Queue;