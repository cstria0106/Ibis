/**
 *
 * @param {Command} command
 */
module.exports.cmd = async function (command) {
    switch (command.type) {
        case 'cat':
            await require('./cat')(command);
            break;
        case 'dog':
            await require('./dog')(command);
            break;
    }
};