const Command = require('./command');
const musicManager = require('../music/music-manager');
const help = require('../utility/help/help');

/**
 * 
 * @param {Command} command 
 */
module.exports.route = function (command) {
    try {
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
    } catch (err) {
        console.log(command.type + ' 명령어 처리 중 오류\n' + err);
        return;
    }
}