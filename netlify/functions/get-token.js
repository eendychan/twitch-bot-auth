exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ token: 'YOUR_SAVED_TOKEN' })
  };
};

feat: add get-token function for bot access

- Create function to retrieve stored tokens
- Setup endpoint for bot token retrieval
- Add CORS support for API access
