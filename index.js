require('dotenv').config()
const auth = require('./auth');

auth.initialize('http://192.168.8.1/', process.env.ROUTER_PASSWORD);