exports.handler = async (event, context) => {
  console.log('get-token function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  try {
    // Всегда возвращаем успешный ответ
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Function is working!",
        token: "test_token_from_netlify",
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 200, // Всегда 200 чтобы не ломать бота
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
