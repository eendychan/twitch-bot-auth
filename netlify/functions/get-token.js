const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    // Читаем сохраненные токены из файла
    const tokensPath = path.join(process.cwd(), 'netlify', 'functions', 'tokens.json');
    
    let tokensData = { tokens: {} };
    
    // Если файл существует - читаем его
    if (fs.existsSync(tokensPath)) {
      tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    }
    
    // Возвращаем последний токен или все токены
    const tokens = Object.values(tokensData.tokens);
    const latestToken = tokens.length > 0 ? tokens[tokens.length - 1].token : null;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        token: latestToken || 'No tokens yet',
        all_tokens: tokensData.tokens,
        count: Object.keys(tokensData.tokens).length
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

feat: add get-token function for bot access

- Create function to retrieve stored tokens
- Setup endpoint for bot token retrieval
- Add CORS support for API access
