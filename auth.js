const axios = require('axios');
const { parseToken, parseSalt, parseNonce } = require('./utils');
const CryptoJS = require('./crypto.js');
const xml2js = require('xml2js');
const fs = require('fs');
const parser = new xml2js.Parser();
module.exports = {
    hostname: '',
    password: '',
    token: '',
    salt: '',
    servernonce: '',
    firstNonce: '',
    finalToken: '',
    initialize: async (hostname, password) => {
        this.hostname = hostname;
        this.password = password;
        await axios.get(this.hostname + 'html/index.html');
        return module.exports.getToken();
    },
    getToken: async () => {
        try { 
            const token = await axios.get(this.hostname + 'api/webserver/token');
            this.token = parseToken(token.data);
            this.cookie = token.headers['set-cookie'];
            return module.exports.privacyNotify();
        } catch (e) {
            return module.exports.error(e);
        }
        
    },
    privacyNotify: async() => {
        try { 
            const options = {
                method: 'POST',
                headers: {
                    '__RequestVerificationToken': this.token,
                    'Cookie': this.cookie,
                },
                data: `<?xml version: "1.0" encoding="UTF-8"?><request><language>en_us</language></request>`,
                url: this.hostname + 'api/app/privacynoticeinfo'
            };
            const securityNotify = await axios(options);
            this.token = securityNotify.headers.__requestverificationtoken;
            return module.exports.firstLoginChallenge();

        } catch (e) {
            return module.exports.error(e);
        }
    },
    firstLoginChallenge: async() => {
        try {
            const scram = CryptoJS.SCRAM();
        this.firstNonce = scram.nonce().toString();
        const options = {
            method: 'POST',
            headers: {
                '__RequestVerificationToken': this.token,
                'Cookie': this.cookie,
            },
            data: `<?xml version="1.0" encoding="UTF-8"?><request><username>admin</username><firstnonce>${this.firstNonce}</firstnonce><mode>1</mode></request>`,
            url: this.hostname + 'api/user/challenge_login'
        };
        const challenger = await axios(options);
        this.salt = parseSalt(challenger.data);
        this.servernonce = parseNonce(challenger.data);
        this.token = challenger.headers.__requestverificationtoken;
        return module.exports.finalLogin();
        } catch (e) {
            return module.exports.error(e);
        }
    },
    finalLogin: async() => {
        try {
            const scarmSalt = CryptoJS.enc.Hex.parse(this.salt);
            const finalNonce = this.servernonce;
            const scram = CryptoJS.SCRAM();
            const authMsg = this.firstNonce + ',' + finalNonce + ',' + finalNonce;
            var clientProof = scram.clientProof(this.password, scarmSalt, 100, authMsg).toString();
            var finalPostData = {
                clientproof: clientProof,
                finalnonce: finalNonce
            };
            const authData = `<?xml version: "1.0" encoding="UTF-8"?><request><clientproof>${finalPostData.clientproof}</clientproof><finalnonce>${finalPostData.finalnonce}</finalnonce></request>`;
            const authOptions = {
                method: 'POST',
                headers: {
                    '__RequestVerificationToken': this.token,
                    'Cookie': this.cookie,
                },
                data: authData,
                url: this.hostname + 'api/user/authentication_login'
            }

            const auth = await axios(authOptions);
            this.cookie = auth.headers['set-cookie'][0];
            this.finalToken = auth.headers.__requestverificationtoken.split('#')[0];
            return module.exports.dhcp_leases();
    
        } catch (e) {
            return module.exports.error(e);
        }
    },
    dhcp_leases: async () => {
        try {
            const getDataOptions = {
                method: 'GET',
                headers: {
                    'Cookie': this.cookie,
                },
                url: this.hostname + 'api/lan/HostInfo'
            }
            const hosts = await axios(getDataOptions);
            let host = '';
            await parser.parseString(hosts.data, (err, result) => host = result.response.Hosts[0].Host);
      
            const db = require('./hosts.json');
            const newIp = [];
            host.forEach(item => {
                const ip = item.MacAddress + '::' + item.HostName;
                if (db.indexOf(ip) === -1) newIp.push(ip);
            });
            if (newIp.length) {
                fs.writeFileSync('./hosts.json', JSON.stringify(db.concat(newIp)));
            }
            console.log(newIp);
           
            return module.exports.logout();
        } catch (e) {
            return module.exports.error(e);
        }

    },
    logout: async () => {
        try {
            const logoutOptions = {
                method: 'POST',
                headers: {
                    '__RequestVerificationToken': this.finalToken,
                    'Cookie': this.cookie,
                },
                data: `<?xml version: "1.0" encoding="UTF-8"?><request><Logout>1</Logout></request>`,
                url: this.hostname + 'api/user/logout'
            }
            const logout = await axios(logoutOptions);
            console.log('Shutting down..');
        } catch (e) {
            return module.exports.error(e);
        }
    },
    error: (e) => {
        console.log('Something failed..shutting down');
        throw new Error(e);
    }
}