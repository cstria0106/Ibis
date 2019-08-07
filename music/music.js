const Discord = require('discord.js');

class Music {
    /**
     * 
     * @param {String} title 
     * @param {String} url 
     * @param {Discord.User} user
     * @param {Number} time
     */
    constructor(title, url, user, time) {
        this.title = title;
        this.url = url;
        this.user = user;
        this.time = time;
    }
}

module.exports = Music;