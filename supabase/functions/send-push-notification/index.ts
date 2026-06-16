import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || record.is_deleted) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conv } = await supabase
      .from("conversations")
      .select("participant_1_id, participant_2_id")
      .eq("id", record.conversation_id)
      .maybeSingle();

    if (!conv) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientId =
      conv.participant_1_id === record.sender_id
        ? conv.participant_2_id
        : conv.participant_1_id;

    const [{ data: recipient }, { data: sender }] = await Promise.all([
      supabase
        .from("users")
        .select("expo_push_token, notification_enabled, display_name")
        .eq("id", recipientId)
        .maybeSingle(),
      supabase
        .from("users")
        .select("display_name, handle")
        .eq("id", record.sender_id)
        .maybeSingle(),
    ]);

    if (!recipient?.expo_push_token) {
      return new Response(JSON.stringify({ ok: true, reason: "no_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // notification_enabled が明示的に false の場合のみスキップ
    if (recipient.notification_enabled === false) {
      return new Response(JSON.stringify({ ok: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = sender?.display_name || sender?.handle || "Someone";
    const body =
      record.message_type === "image"
        ? "📷 写真を送りました"
        : record.message_type === "sticker"
        ? record.content || "😊"
        : record.content?.slice(0, 100) ?? "";

    // オンライン・オフライン問わず常に送信
    const pushPayload = {
      to: recipient.expo_push_token,
      sound: "default",
      title: senderName,
      body,
      data: {
        conversationId: record.conversation_id,
        senderId: record.sender_id,
        messageType: record.message_type,
        messageContent: record.content ?? "",
        type: "new_message",
      },
      // 優先度を高に設定（フォアグラウンド時も確実に届ける）
      priority: "high",
      // Android用通知チャンネル
      channelId: "messages",
      // iOS: バックグラウンドでもアプリを起こす
      _contentAvailable: true,
      badge: 1,
    };

    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.json();
    console.log("Push result:", JSON.stringify(pushResult));

    return new Response(JSON.stringify({ ok: true, push: pushResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
