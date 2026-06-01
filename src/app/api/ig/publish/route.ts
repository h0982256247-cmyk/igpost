import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

import { validateAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  createMediaContainer,
  publishMedia,
  waitForContainerReady,
} from "@/lib/instagram";
import { sendBotNotification, updateLarkRecord } from "@/lib/lark";
import type { PublishRequest } from "@/types";

export async function POST(req: NextRequest) {
  // ── 1. 驗證 Authorization ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!validateAuth(authHeader)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ── 2. 解析與驗證請求 body ─────────────────────────────────────────────────
  let body: PublishRequest;
  try {
    body = (await req.json()) as PublishRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { record_id, title, caption, image_url } = body;

  if (!record_id || !title || !caption || !image_url) {
    return NextResponse.json(
      {
        success: false,
        error: "缺少必要欄位：record_id, title, caption, image_url",
      },
      { status: 400 }
    );
  }

  // ── 3. 主流程 ──────────────────────────────────────────────────────────────
  try {
    // Step 1：建立 Media Container
    const containerId = await createMediaContainer(image_url, caption);

    // Step 2：等待 Container 處理完成
    await waitForContainerReady(containerId);

    // Step 3：發布 Media
    const mediaId = await publishMedia(containerId);

    const igPostUrl = `https://www.instagram.com/p/${mediaId}/`;

    // Step 4：回寫 Lark Base
    await updateLarkRecord(record_id, {
      發布狀態: "已發布",
      Instagram_Media_ID: mediaId,
      Instagram_Post_URL: igPostUrl,
      發布時間: new Date().toISOString(),
    });

    // Step 5：Bot 通知成功
    await sendBotNotification(
      `✅ Instagram 發布成功`,
      `**標題：** ${title}\n**Record ID：** ${record_id}\n**Media ID：** ${mediaId}\n**貼文連結：** ${igPostUrl}`
    );

    return NextResponse.json({
      success: true,
      data: {
        media_id: mediaId,
        post_url: igPostUrl,
      },
    });
  } catch (err) {
    // ── 錯誤處理：回寫 Lark + Bot 通知失敗 ──────────────────────────────────
    const errorMessage =
      err instanceof AppError ? err.message : "未知錯誤";
    const errorDetail =
      err instanceof AppError ? err.detail : String(err);
    const statusCode =
      err instanceof AppError ? err.statusCode : 500;

    console.error(`[publish] 發布失敗：${errorMessage}`, errorDetail);

    // 嘗試回寫失敗狀態到 Lark（不 throw，避免遮蓋原始錯誤）
    try {
      await updateLarkRecord(record_id, {
        發布狀態: "發布失敗",
        錯誤訊息: errorDetail ? `${errorMessage}：${errorDetail}` : errorMessage,
      });
    } catch (larkErr) {
      console.error("[publish] 回寫 Lark 失敗狀態時出錯：", larkErr);
    }

    // 嘗試發送失敗通知
    try {
      await sendBotNotification(
        `❌ Instagram 發布失敗`,
        `**標題：** ${title}\n**Record ID：** ${record_id}\n**原因：** ${errorMessage}${errorDetail ? `\n**詳情：** ${errorDetail}` : ""}`
      );
    } catch (botErr) {
      console.error("[publish] 發送 Bot 失敗通知時出錯：", botErr);
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        detail: errorDetail,
      },
      { status: statusCode }
    );
  }
}
