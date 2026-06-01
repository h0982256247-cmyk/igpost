import { NextRequest, NextResponse } from "next/server";

import { validateAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { updateLarkRecord } from "@/lib/lark";
import type { UpdateRecordRequest } from "@/types";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!validateAuth(authHeader)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: UpdateRecordRequest;
  try {
    body = (await req.json()) as UpdateRecordRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { record_id, fields } = body;

  if (!record_id || !fields || typeof fields !== "object") {
    return NextResponse.json(
      { success: false, error: "缺少必要欄位：record_id, fields" },
      { status: 400 }
    );
  }

  try {
    await updateLarkRecord(record_id, fields);

    return NextResponse.json({
      success: true,
      data: { record_id, updated_fields: Object.keys(fields) },
    });
  } catch (err) {
    const errorMessage =
      err instanceof AppError ? err.message : "更新 Lark Record 失敗";
    const errorDetail =
      err instanceof AppError ? err.detail : String(err);
    const statusCode =
      err instanceof AppError ? err.statusCode : 500;

    console.error("[update-record] 錯誤：", errorMessage, errorDetail);

    return NextResponse.json(
      { success: false, error: errorMessage, detail: errorDetail },
      { status: statusCode }
    );
  }
}
