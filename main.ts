// main.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

// Получаем API ключ из environment variables
const PASTEBIN_API_KEY = Deno.env.get("PASTEBIN_API_KEY");

// Главный обработчик
serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔐 API: Сохранить токен в Pastebin
  if (pathname === "/api/save-token" && req.method === "POST") {
    try {
      const { token, channel } = await req.json();
      
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: "Token is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!PASTEBIN_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "Pastebin API key not configured" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Создаем пасту на Pastebin
      const pasteData = new URLSearchParams();
      pasteData.append('api_dev_key', PASTEBIN_API_KEY);
      pasteData.append('api_option', 'paste');
      pasteData.append('api_paste_code', JSON.stringify({
        token: token,
        channel: channel || 'unknown',
        timestamp: new Date().toISOString()
      }, null, 2));
      pasteData.append('api_paste_name', `Twitch Token ${new Date().toLocaleDateString()}`);
      pasteData.append('api_paste_private', '1'); // Приватная паста
      pasteData.append('api_paste_format', 'json');
      pasteData.append('api_paste_expire_date', 'N'); // Never expire

      const pasteResponse = await fetch('https://pastebin.com/api/api_post.php', {
        method: 'POST',
        body: pasteData
      });

      const result = await pasteResponse.text();

      if (result.includes('https://pastebin.com/')) {
        const pasteUrl = result;
        console.log(`✅ Token saved to Pastebin: ${pasteUrl}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            paste_url: pasteUrl,
            message: "Token saved to Pastebin" 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error(`❌ Pastebin error: ${result}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Pastebin error: ${result}`,
            token_preview: token.substring(0, 15) + '...' // На всякий случай
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } catch (error) {
      console.error("❌ Save token error:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          token_preview: token ? token.substring(0, 15) + '...' : 'none'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 📋 API: Получить последнюю пасту (опционально)
  if (pathname === "/api/get-latest-paste" && req.method === "GET") {
    try {
      // Здесь можно добавить логику получения списка паст
      // Но для простоты будем просто возвращать инструкцию
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Check your Pastebin account for latest tokens",
          instruction: "Bot will read tokens directly from Pastebin URLs"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Get paste error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 🌐 Обслуживание статических файлов (frontend)
  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: false,
    enableCors: true,
  });
});

console.log("🚀 Pastebin Server running");
console.log("📝 Tokens will be saved to Pastebin");
