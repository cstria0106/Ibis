const Command = require('../../system/command');
const fs = require('fs');
const config = require('../../system/config');
const Discord = require('discord.js');
const alert = require('../alert');

var commands;

module.exports.init = function () {
    fs.readFile('utility/help/commands.json', 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        commands = JSON.parse(data);
    });
};

/**
 * @param {Command} command
 */
module.exports.cmd = function (command) {
    if (command.args.length == 0) {
        // 명령어 목록
        const embed = new Discord.RichEmbed();
        embed.setDescription(`명령어 목록은 다음과 같습니다.\n\`${config.prefix}help <명령어>\`를 통해 자세한 설명을 볼 수 있습니다.`);
        embed.setColor('#00ccff');

        commands.forEach(set => {
            const list = set.list;

            var value = '';
            list.forEach(element => {
                value += `\`${config.prefix}${element.name.split('|')[0]}\`\n`;
            });

            const name = set.category;
            embed.addField(name, value, true);
        });

        command.msg.channel.send(embed);
        return;
    } else if (command.args.length == 1) {
        // 명령어 설명
        const embed = new Discord.RichEmbed();

        var cmd;

        commands.forEach(set => {
            set.list.some(element => {
                if (element.name.split('|').includes(command.args[0])) {
                    cmd = element;
                }
                return cmd;
            });

            return cmd;
        });

        if (!cmd) {
            return alert('ERROR', '해당하는 명령어가 없습니다.', command.msg.channel);
        }

        embed.setTitle(`${config.prefix}${cmd.name.split('|')[0]}`);
        embed.setDescription(cmd.description);
        embed.addField('사용법', `\`${config.prefix}${cmd.usage}\``, true);
        embed.setColor('#00ccff');

        if (cmd.examples.length > 0) {
            var exampleText = '';

            cmd.examples.forEach(example => {
                exampleText += `\`${config.prefix}${example.command}\` - ${example.description}\n`;
            });
            embed.addField('예제', exampleText, false);
        }

        command.msg.channel.send(embed);
    } else {
        return alert('ERROR', '잘못된 명령어입니다.', command.msg.channel);
    }
};