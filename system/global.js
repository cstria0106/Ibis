const fs = require('fs');

module.exports = {
    disconnectionTime: 60,
    searchTime: 30,
    getToken: function () {
        return fs.readFileSync('system/token.txt', 'utf8');
    }
} 