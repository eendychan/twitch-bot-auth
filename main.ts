// main.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

// Открываем KV базу данных
const kv = await Deno.openKv();

// Главный обработчик
serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  console.log(`📨 ${req.method} ${pathname}`);

  // CORS headers для всех ответов
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔐 API: Сохранить токен
  if (pathname === "/api/save-token" && req.method === "POST") {
    try {
      const { token, channel } = await req.json();
      
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: "Token is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Генерируем уникальный ID
      const id = Date.now().toString();
      const tokenData = {
        id,
        token,
        channel: channel || 'unknown',
        timestamp: new Date().toISOString(),
        used: false,
        used_at: null
      };

      // Сохраняем в KV базу
      await kv.set(["tokens", id], tokenData);
      
      console.log(`✅ Token saved: ${id} for channel: ${tokenData.channel}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          id,
          message: "Token saved successfully" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Save token error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 📋 API: Получить все токены
  if (pathname === "/api/get-tokens" && req.method === "GET") {
    try {
      const tokens = [];
      
      // Получаем все токены из базы
      for await (const entry of kv.list({ prefix: ["tokens"] })) {
        tokens.push(entry.value);
      }
      
      // Сортируем по времени (новые сначала)
      tokens.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log(`📊 Retrieved ${tokens.length} tokens`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tokens,
          count: tokens.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Get tokens error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 🎯 API: Получить только НЕиспользованные токены
  if (pathname === "/api/get-new-tokens" && req.method === "GET") {
    try {
      const newTokens = [];
      
      for await (const entry of kv.list({ prefix: ["tokens"] })) {
        if (!entry.value.used) {
          newTokens.push(entry.value);
        }
      }
      
      newTokens.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log(`🆕 Found ${newTokens.length} new tokens`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tokens: newTokens,
          count: newTokens.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Get new tokens error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ✅ API: Пометить токен как использованный
  if (pathname === "/api/mark-used" && req.method === "POST") {
    try {
      const { id } = await req.json();
      
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "Token ID is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получаем текущие данные токена
      const tokenEntry = await kv.get(["tokens", id]);
      if (!tokenEntry.value) {
        return new Response(
          JSON.stringify({ success: false, error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Обновляем статус
      const updatedToken = {
        ...tokenEntry.value,
        used: true,
        used_at: new Date().toISOString()
      };

      await kv.set(["tokens", id], updatedToken);
      
      console.log(`✅ Token ${id} marked as used`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Token marked as used" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Mark used error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 🗑️ API: Удалить токен
  if (pathname === "/api/delete-token" && req.method === "POST") {
    try {
      const { id } = await req.json();
      
      await kv.delete(["tokens", id]);
      
      console.log(`🗑️ Token ${id} deleted`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Token deleted" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Delete token error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 📊 API: Статистика
  if (pathname === "/api/stats" && req.method === "GET") {
    try {
      let total = 0;
      let used = 0;
      let newTokens = 0;
      
      for await (const entry of kv.list({ prefix: ["tokens"] })) {
        total++;
        if (entry.value.used) {
          used++;
        } else {
          newTokens++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          stats: {
            total,
            used,
            new: newTokens
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Stats error:", error);
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

console.log("🚀 Server running on http://localhost:8000");
