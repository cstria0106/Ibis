const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.DISCORD_PREFIX,
    noQueueDisconnection: false,
    disconnectionTime: process.env.DISCORD_PREFIX,
    searchTime: 30,
};