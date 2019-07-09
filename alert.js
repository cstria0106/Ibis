const Discord = require('discord.js');

/**
 * @param {String} type ['OK', 'WARNING', 'ERROR']
 * @param {String} text
 * @param {Discord.Message} msg
 */
module.exports = async function (type, text, msg) {
    var icon;

    switch (type) {
        case 'OK':
            icon = '✅';
            break;

        case 'WARNING':
            icon = '⚠';
            break;

        case 'ERROR':
            icon = '❌';
            break;

        default:
            icon = '';
            break;
    }

    const embed = new Discord.RichEmbed()
        .setTitle(`${icon} ${text}`)

    if (icon == '') embed.setTitle(text);

    await msg.channel.send(embed);

    return;
}