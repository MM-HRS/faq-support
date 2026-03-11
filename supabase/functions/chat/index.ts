// supabase/functions/chat/index.ts
// デプロイ: supabase functions deploy chat

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // 本番では自サイトのオリジンに絞ること
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { question, faqContext, history } = await req.json();

    // 入力バリデーション
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "質問が空です" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (question.length > 1000) {
      return new Response(JSON.stringify({ error: "質問が長すぎます（1000文字以内）" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // APIキーはサーバーサイドの環境変数から取得 (絶対にフロントへ渡さない)
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY が設定されていません");
    }

    // 会話履歴を Gemini の形式に変換
    const historyContents = (history ?? []).map(
      (h: { role: string; text: string }) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })
    );

    const systemPrompt = `あなたは優秀なカスタマーサポートです。
以下のFAQリストの知識のみを使って回答してください。
リストにない場合は正直に「分からない」旨を伝え、担当者へ繋ぐよう案内してください。

【FAQリスト】
${faqContext}

【制約】
回答の最後に必ず [META]{"confidence": 0-100, "escalate": true/false}[/META] という形式でメタデータを付与してください。`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...historyContents,
          { role: "user", parts: [{ text: question }] },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      throw new Error(err.error?.message ?? `Gemini HTTP ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText: string = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ text: rawText }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
