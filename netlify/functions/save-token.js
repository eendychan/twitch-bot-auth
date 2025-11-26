// save-token.js
exports.handler = async function(event, context) {
  console.log('save-token function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    let body = {};
    if (event.body) {
      body = JSON.parse(event.body);
    }
    
    console.log('Received body:', body);
    
    const response = {
      success: true,
      message: "Token received successfully",
      received_token: body.token ? true : false,
      token_preview: body.token ? body.token.substring(0, 10) + '...' : null,
      timestamp: new Date().toISOString()
    };
    
    console.log('Returning:', response);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in save-token:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

feat: add save-token function for Twitch tokens

- Create serverless function to receive auth tokens
- Add CORS headers for cross-domain requests
- Handle POST requests with token data
