import type {
  IgContainerStatus,
  IgContainerStatusResponse,
  IgCreateContainerResponse,
  IgPublishResponse,
} from "@/types";
import { InstagramError, TimeoutError } from "./errors";

const IG_API_BASE = "https://graph.instagram.com/v21.0";

// 輪詢設定
const POLL_INTERVAL_MS = 3_000; // 每次間隔 3 秒
const POLL_MAX_ATTEMPTS = 10;   // 最多等 30 秒

function getCredentials() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;

  if (!accessToken || !userId) {
    throw new InstagramError(
      "Instagram 環境變數未設定",
      "META_ACCESS_TOKEN 或 IG_USER_ID 缺少"
    );
  }

  return { accessToken, userId };
}

/**
 * Step 1：建立 Media Container
 */
export async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<string> {
  const { accessToken, userId } = getCredentials();

  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const res = await fetch(`${IG_API_BASE}/${userId}/media`, {
    method: "POST",
    body: params,
  });

  const data = (await res.json()) as IgCreateContainerResponse & {
    error?: { message: string; code: number };
  };

  if (!res.ok || data.error) {
    throw new InstagramError(
      "建立 Media Container 失敗",
      data.error?.message ?? `HTTP ${res.status}`
    );
  }

  console.log(`[instagram] Container 建立成功：${data.id}`);
  return data.id;
}

/**
 * 取得 Container 狀態
 */
async function getContainerStatus(
  containerId: string
): Promise<IgContainerStatus> {
  const { accessToken } = getCredentials();

  const url = new URL(`${IG_API_BASE}/${containerId}`);
  url.searchParams.set("fields", "status_code");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as IgContainerStatusResponse & {
    error?: { message: string };
  };

  if (!res.ok || data.error) {
    throw new InstagramError(
      "取得 Container 狀態失敗",
      data.error?.message ?? `HTTP ${res.status}`
    );
  }

  return data.status_code;
}

/**
 * 輪詢等待 Container 處理完成
 */
export async function waitForContainerReady(
  containerId: string
): Promise<void> {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    const status = await getContainerStatus(containerId);

    console.log(
      `[instagram] Container ${containerId} 狀態：${status}（第 ${attempt} 次）`
    );

    if (status === "FINISHED") return;

    if (status === "ERROR" || status === "EXPIRED") {
      throw new InstagramError(
        `Container 處理失敗`,
        `status_code: ${status}`
      );
    }

    // IN_PROGRESS → 繼續等待
    if (attempt < POLL_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new TimeoutError(
    `Instagram Media Container 超過 ${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000} 秒仍未完成`
  );
}

/**
 * Step 2：發布 Media
 */
export async function publishMedia(containerId: string): Promise<string> {
  const { accessToken, userId } = getCredentials();

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const res = await fetch(`${IG_API_BASE}/${userId}/media_publish`, {
    method: "POST",
    body: params,
  });

  const data = (await res.json()) as IgPublishResponse & {
    error?: { message: string; code: number };
  };

  if (!res.ok || data.error) {
    throw new InstagramError(
      "發布 Media 失敗",
      data.error?.message ?? `HTTP ${res.status}`
    );
  }

  console.log(`[instagram] 發布成功，media_id：${data.id}`);
  return data.id;
}
