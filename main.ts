// main.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

// Глобальная переменная для KV
let kv: any = null;

// Инициализация KV (асинхронно)
async function initializeKV() {
  try {
    // Проверяем доступность KV API
    if (typeof Deno !== 'undefined' && Deno.openKv) {
      kv = await Deno.openKv();
      console.log("✅ KV Storage initialized");
    } else {
      console.log("⚠️ KV Storage not available, using in-memory storage");
      // Fallback: используем память как временное хранилище
      kv = createMemoryStorage();
    }
  } catch (error) {
    console.log("⚠️ KV initialization failed, using in-memory storage:", error);
    kv = createMemoryStorage();
  }
}

// In-memory хранилище как fallback
function createMemoryStorage() {
  const storage = new Map();
  return {
    async set(key: any, value: any) {
      storage.set(JSON.stringify(key), value);
    },
    async get(key: any) {
      return { value: storage.get(JSON.stringify(key)) };
    },
    async delete(key: any) {
      storage.delete(JSON.stringify(key));
    },
    async list(options: { prefix: any[] }) {
      const prefix = JSON.stringify(options.prefix);
      const entries = [];
      for (const [key, value] of storage.entries()) {
        if (key.startsWith(prefix)) {
          entries.push({ value });
        }
      }
      return entries;
    }
  };
}

// Инициализируем KV при старте
await initializeKV();

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

      // Сохраняем в хранилище
      await kv.set(["tokens", id], tokenData);
      
      console.log(`✅ Token saved: ${id} for channel: ${tokenData.channel}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          id,
          message: "Token saved successfully",
          storage: kv instanceof Map ? "memory" : "kv"
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
      
      // Получаем все токены из хранилища
      const entries = await kv.list({ prefix: ["tokens"] });
      for await (const entry of entries) {
        tokens.push(entry.value);
      }
      
      // Сортируем по времени (новые сначала)
      tokens.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log(`📊 Retrieved ${tokens.length} tokens from ${kv instanceof Map ? 'memory' : 'KV'}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tokens,
          count: tokens.length,
          storage: kv instanceof Map ? "memory" : "kv"
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
      
      const entries = await kv.list({ prefix: ["tokens"] });
      for await (const entry of entries) {
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
      
      const entries = await kv.list({ prefix: ["tokens"] });
      for await (const entry of entries) {
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
          },
          storage: kv instanceof Map ? "memory" : "kv"
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
console.log("💾 Storage type:", kv instanceof Map ? "Memory" : "KV");
