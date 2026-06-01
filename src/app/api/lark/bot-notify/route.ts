import { NextRequest, NextResponse } from "next/server";

import { validateAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { sendBotNotification } from "@/lib/lark";
import type { BotNotifyRequest } from "@/types";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!validateAuth(authHeader)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: BotNotifyRequest;
  try {
    body = (await req.json()) as BotNotifyRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, content, success } = body;

  if (!title || !content || typeof success !== "boolean") {
    return NextResponse.json(
      { success: false, error: "缺少必要欄位：title, content, success" },
      { status: 400 }
    );
  }

  try {
    const emoji = success ? "✅" : "❌";
    await sendBotNotification(`${emoji} ${title}`, content);

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (err) {
    const errorMessage =
      err instanceof AppError ? err.message : "Bot 通知發送失敗";
    const errorDetail =
      err instanceof AppError ? err.detail : String(err);
    const statusCode =
      err instanceof AppError ? err.statusCode : 500;

    console.error("[bot-notify] 錯誤：", errorMessage, errorDetail);

    return NextResponse.json(
      { success: false, error: errorMessage, detail: errorDetail },
      { status: statusCode }
    );
  }
}
