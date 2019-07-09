const Command = require('./command');
const musicManager = require('./music-manager');

/**
 * 
 * @param {Command} command 
 */
module.exports.route = function(command){
    switch(command.type){
        case 'play':
        case 'p':
        case 'skip':
        case 'leave':
        case 'queue':
        case 'q':
        case 'nowplaying':
        case 'np':
            musicManager.cmd(command);
            break;
    }
}