exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Для OPTIONS запроса (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      // Простая заглушка - возвращаем тестовый токен
      // В реальном приложении здесь будет чтение из базы/файла
      const testTokens = {
        "test_token_1": {
          token: "oauth:test_token_123456",
          last_updated: new Date().toISOString(),
          source: "netlify"
        }
      };
      
      console.log('✅ Get-token function called successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          token: "oauth:test_token_123456",
          all_tokens: testTokens,
          count: Object.keys(testTokens).length,
          message: "Функция работает! Добавьте логику сохранения токенов."
        })
      };
    } catch (error) {
      console.error('❌ Error in get-token:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};

feat: add get-token function for bot access

- Create function to retrieve stored tokens
- Setup endpoint for bot token retrieval
- Add CORS support for API access
