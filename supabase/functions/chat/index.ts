import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);

    const body = await req.json();
    console.log("Received question:", body.question);

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY が設定されていません");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    console.log("Calling Gemini API...");

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: body.question }] }],
      }),
    });

    console.log("Gemini status:", geminiRes.status);
    const geminiData = await geminiRes.json();
    console.log("Gemini response:", JSON.stringify(geminiData).slice(0, 200));

    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message ?? `Gemini HTTP ${geminiRes.status}`);
    }

    const text = geminiData.candidates[0].content.parts[0].text;
    return new Response(JSON.stringify({ text }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
// redeploy 1
