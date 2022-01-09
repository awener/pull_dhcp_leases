module.exports = {
    parseToken: (data) => {
        return data.split('<token>')[1].split('</token>')[0].substr(32);
    },
    parseSalt: (data) => {
        return data.split('<salt>')[1].split('</salt>')[0];
    },
    parseNonce: (data) => {
        return data.split('<servernonce>')[1].split('</servernonce>')[0];
    }
}