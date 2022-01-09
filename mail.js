const axios = require('axios');

module.exports = async (data) => {
    try {
        console.log(data);
        const options = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': process.env.SENDINBLUE_API_KEY,
        },
        data: JSON.stringify({
            sender: { email: process.env.SENDER_EMAIL },
            to: [{ email: process.env.ADMIN_EMAIL }],
            textContent: data,
            subject: `New host`,
        }),
        };
        await axios(process.env.SENDINBLUE_API_URL, options);
    } catch (e) {
        throw new Error(e);
    }
  }