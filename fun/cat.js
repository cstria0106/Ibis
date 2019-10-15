const request = require('request-promise-native');
const alert = require('../utility/alert');

/**
 *
 * @param {Command} command
 */
module.exports = async function (command) {
    const url = 'https://api.thecatapi.com/v1/images/search';

    try {
        const res = JSON.parse(await request(url));
        
        if (res.length > 0) {
            await command.msg.reply({
                files: [
                    res[0].url,
                ],
            });
        } else {
            return alert('ERROR', '명령을 처리할 수 없습니다.', command.msg.channel);
        }
    } catch (e) {
        return alert('ERROR', '명령을 처리할 수 없습니다.', command.msg.channel);
    }
};