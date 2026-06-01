import type { LarkTenantTokenResponse, LarkUpdateRecordResponse } from "@/types";
import { LarkError } from "./errors";

const LARK_API_BASE = "https://open.larksuite.com/open-apis";

// ─── Tenant Access Token（記憶體快取，有效 1.5 小時）────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();

  // 若快取仍有效（保留 5 分鐘緩衝），直接回傳
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new LarkError(
      "Lark 環境變數未設定",
      "LARK_APP_ID 或 LARK_APP_SECRET 缺少"
    );
  }

  const res = await fetch(
    `${LARK_API_BASE}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  const data = (await res.json()) as LarkTenantTokenResponse;

  if (data.code !== 0) {
    throw new LarkError("取得 Lark tenant_access_token 失敗", data.msg);
  }

  cachedToken = data.tenant_access_token;
  // expire 單位是秒，Vercel serverless 環境每次 cold start 會重置，快取主要給同一 instance 內多次呼叫使用
  tokenExpiresAt = now + data.expire * 1000;

  console.log("[lark] tenant_access_token 已刷新");
  return cachedToken;
}

// ─── Lark Base：更新記錄 ────────────────────────────────────────────────────

export async function updateLarkRecord(
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const token = await getTenantAccessToken();
  const appToken = process.env.LARK_APP_TOKEN;
  const tableId = process.env.LARK_TABLE_ID;

  if (!appToken || !tableId) {
    throw new LarkError(
      "Lark Base 環境變數未設定",
      "LARK_APP_TOKEN 或 LARK_TABLE_ID 缺少"
    );
  }

  const res = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  );

  const data = (await res.json()) as LarkUpdateRecordResponse;

  if (data.code !== 0) {
    throw new LarkError("更新 Lark Record 失敗", data.msg);
  }

  console.log(`[lark] Record ${recordId} 更新成功`);
}

// ─── Lark Bot Webhook 通知 ──────────────────────────────────────────────────

export async function sendBotNotification(
  title: string,
  content: string
): Promise<void> {
  const webhookUrl = process.env.LARK_BOT_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new LarkError("LARK_BOT_WEBHOOK_URL 環境變數未設定");
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "interactive",
      card: {
        elements: [
          {
            tag: "div",
            text: {
              content,
              tag: "lark_md",
            },
          },
        ],
        header: {
          title: {
            content: title,
            tag: "plain_text",
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new LarkError("Bot 通知發送失敗", text);
  }

  console.log("[lark] Bot 通知已發送");
}
