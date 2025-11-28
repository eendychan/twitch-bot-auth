// main.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

// In-memory хранилище (работает на Deno Deploy)
class MemoryStorage {
  private tokens: any[] = [];
  private nextId = 1;

  async addToken(token: string, channel: string = 'unknown') {
    const tokenData = {
      id: (this.nextId++).toString(),
      token,
      channel,
      timestamp: new Date().toISOString(),
      used: false,
      used_at: null
    };
    
    this.tokens.push(tokenData);
    console.log(`✅ Token saved: ${tokenData.id} for channel: ${channel}`);
    return tokenData.id;
  }

  async getTokens() {
    return [...this.tokens].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getNewTokens() {
    return this.tokens.filter(token => !token.used)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async markTokenUsed(id: string) {
    const token = this.tokens.find(t => t.id === id);
    if (token) {
      token.used = true;
      token.used_at = new Date().toISOString();
      console.log(`✅ Token ${id} marked as used`);
      return true;
    }
    return false;
  }

  async deleteToken(id: string) {
    const index = this.tokens.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tokens.splice(index, 1);
      return true;
    }
    return false;
  }

  getStats() {
    const total = this.tokens.length;
    const used = this.tokens.filter(t => t.used).length;
    const newTokens = this.tokens.filter(t => !t.used).length;
    
    return { total, used, new: newTokens };
  }
}

// Глобальное хранилище
const storage = new MemoryStorage();

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

      const id = await storage.addToken(token, channel);

      return new Response(
        JSON.stringify({ 
          success: true, 
          id,
          message: "Token saved successfully",
          storage: "memory"
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
      const tokens = await storage.getTokens();
      
      console.log(`📊 Retrieved ${tokens.length} tokens from memory`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tokens,
          count: tokens.length,
          storage: "memory"
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
      const tokens = await storage.getNewTokens();
      
      console.log(`🆕 Found ${tokens.length} new tokens`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          tokens: tokens,
          count: tokens.length 
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

      const success = await storage.markTokenUsed(id);

      if (!success) {
        return new Response(
          JSON.stringify({ success: false, error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
      
      const success = await storage.deleteToken(id);
      
      if (!success) {
        return new Response(
          JSON.stringify({ success: false, error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
      const stats = storage.getStats();

      return new Response(
        JSON.stringify({ 
          success: true,
          stats: stats,
          storage: "memory"
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

  // ♻️ API: Очистить все токены (для тестирования)
  if (pathname === "/api/clear-all" && req.method === "POST") {
    try {
      // Просто создаем новый экземпляр хранилища
      // В реальном приложении добавь безопасность!
      Object.assign(storage, new MemoryStorage());
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "All tokens cleared"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("❌ Clear error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 🌐 Обслуживание статических файлов (frontend)
  const staticResponse = serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: false,
    enableCors: true,
  });

  if (staticResponse.status !== 404) {
    return staticResponse;
  }

  // 404 для неизвестных путей
  return new Response(
    JSON.stringify({ success: false, error: "Not found" }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

console.log("🚀 Memory Storage Server running on http://localhost:8000");
console.log("💾 Using in-memory storage (persists until server restart)");
