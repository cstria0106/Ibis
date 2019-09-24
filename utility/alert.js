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

    try {
        await channel.send(embed);
    }
    catch (err) {
        console.log('alert 메세지 전송 실패\n' + err);
    }

    return;
}