// simple-main.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

// Простое файловое хранилище
class JSONStorage {
  private filePath = "tokens.json";
  
  async loadTokens() {
    try {
      const data = await Deno.readTextFile(this.filePath);
      return JSON.parse(data);
    } catch {
      return { tokens: [] };
    }
  }
  
  async saveTokens(data: any) {
    await Deno.writeTextFile(this.filePath, JSON.stringify(data, null, 2));
  }
  
  async addToken(tokenData: any) {
    const data = await this.loadTokens();
    data.tokens.push(tokenData);
    await this.saveTokens(data);
    return tokenData.id;
  }
  
  async getTokens() {
    const data = await this.loadTokens();
    return data.tokens;
  }
  
  async markTokenUsed(id: string) {
    const data = await this.loadTokens();
    const token = data.tokens.find((t: any) => t.id === id);
    if (token) {
      token.used = true;
      token.used_at = new Date().toISOString();
      await this.saveTokens(data);
      return true;
    }
    return false;
  }
}

const storage = new JSONStorage();

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

  // 🔐 Сохранить токен
  if (pathname === "/api/save-token" && req.method === "POST") {
    try {
      const { token, channel } = await req.json();
      const id = Date.now().toString();
      const tokenData = {
        id,
        token,
        channel: channel || 'unknown',
        timestamp: new Date().toISOString(),
        used: false,
        used_at: null
      };
      
      await storage.addToken(tokenData);
      
      return new Response(
        JSON.stringify({ success: true, id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 📋 Получить токены
  if (pathname === "/api/get-tokens" && req.method === "GET") {
    try {
      const tokens = await storage.getTokens();
      tokens.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return new Response(
        JSON.stringify({ success: true, tokens, count: tokens.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 🎯 Новые токены
  if (pathname === "/api/get-new-tokens" && req.method === "GET") {
    try {
      const tokens = await storage.getTokens();
      const newTokens = tokens.filter((t: any) => !t.used);
      newTokens.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return new Response(
        JSON.stringify({ success: true, tokens: newTokens, count: newTokens.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ✅ Пометить использованным
  if (pathname === "/api/mark-used" && req.method === "POST") {
    try {
      const { id } = await req.json();
      const success = await storage.markTokenUsed(id);
      
      return new Response(
        JSON.stringify({ success, message: success ? "Token marked as used" : "Token not found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Статические файлы
  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: false,
    enableCors: true,
  });
});

console.log("🚀 Simple JSON Server running");
