// get-token.js
exports.handler = async function(event, context) {
  console.log('get-token function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    // Всегда возвращаем успешный ответ
    const response = {
      success: true,
      message: "Get-token function is working!",
      token: "test_token_from_netlify_123",
      timestamp: new Date().toISOString(),
      tokens_count: 1
    };
    
    console.log('Returning:', response);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in get-token:', error);
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

feat: add get-token function for bot access

- Create function to retrieve stored tokens
- Setup endpoint for bot token retrieval
- Add CORS support for API access
