const Command = require('./command');
const musicManager = require('../music/music-manager');
const help = require('../utility/help/help');

/**
 * 
 * @param {Command} command 
 */
module.exports.route = function (command) {
    switch (command.type) {
        case 'play':
        case 'p':
        case 'skip':
        case 'leave':
        case 'queue':
        case 'q':
        case 'nowplaying':
        case 'np':
        case 'repeat':
        case 'clear':
        case 'delete':
        case 'shuffle':
        case 'join':
            musicManager.cmd(command);
            break;

        case 'help':
            help.cmd(command);
            break;
    }
}