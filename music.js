const Discord = require('discord.js');

class Music{
    /**
     * 
     * @param {String} title 
     * @param {String} url 
     * @param {Discord.User} user
     */
    constructor(title, url, user){
        this.title = title;
        this.url = url;
        this.user = user;
    }
}

module.exports = Music;