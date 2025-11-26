exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { token } = JSON.parse(event.body);
      console.log('✅ Token received:', token.substring(0, 15) + '...');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Token saved' })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save token' })
      };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};

feat: add save-token function for Twitch tokens

- Create serverless function to receive auth tokens
- Add CORS headers for cross-domain requests
- Handle POST requests with token data
