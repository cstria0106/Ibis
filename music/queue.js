const Discord = require('discord.js');
const Music = require('./music');

class Queue {
    /**
     * 
     * @param {Discord.TextChannel} textChannel 
     * @param {Discord.VoiceChannel} voiceChannel
     * @param {Discord.Guild} guild
     */
    constructor(textChannel, voiceChannel, guild) {
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.guild = guild;

        this.playing = false;
        this.connected = false;

        this.repeat = false;
        this.shuffle = false;

        /**
         * @type {Music[]}
         */
        this.musics = [];
    }
}

module.exports = Queue;