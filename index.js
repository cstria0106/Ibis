const Discord = require('discord.js');
const global = require('./global');
const config = require('./config');
const musicManager = require('./music-manager');
const Command = require('./command');
const router = require('./router');

var client = new Discord.Client();

client.on('ready', function(){
    client.user.setActivity('!help', {type: "LISTENING"});
})

client.on('message', function(msg){
   var text = msg.content.trim();
   if(text.startsWith(config.prefix)){
       var command = new Command(msg);
       router.route(command);
   }
});

client.login(global.token);