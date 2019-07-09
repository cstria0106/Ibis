const Discord = require('discord.js');

/**
 * @param {String} type ['OK', 'WARNING', 'ERROR']
 * @param {String} text
 * @param {Discord.TextChannel} channel
 */
module.exports = async function (type, text, channel) {
    var icon;
    const embed = new Discord.RichEmbed()

    switch (type) {
        case 'OK':
            icon = '✅';
            embed.setColor('#00cc00');
            break;

        case 'WARNING':
            icon = '⚠';
            embed.setColor('#eeee00');
            break;

        case 'ERROR':
            icon = '❌';
            embed.setColor('#dd0000');
            break;

        default:
            icon = '';
            break;
    }

    if (icon == '') {
        embed.setTitle(text);
    }
    else {
        embed.setTitle(`${icon} ${text}`);
    }

    await channel.send(embed);

    return;
}