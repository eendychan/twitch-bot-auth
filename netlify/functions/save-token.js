const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { token, channel } = JSON.parse(event.body);
      
      // Сохраняем в файл (в реальном проекте используйте базу)
      const tokensPath = path.join(process.cwd(), 'netlify', 'functions', 'tokens.json');
      const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      
      tokensData.tokens[channel || 'default'] = token;
      fs.writeFileSync(tokensPath, JSON.stringify(tokensData, null, 2));
      
      console.log('✅ Token saved for channel:', channel);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    } catch (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};

feat: add save-token function for Twitch tokens

- Create serverless function to receive auth tokens
- Add CORS headers for cross-domain requests
- Handle POST requests with token data
