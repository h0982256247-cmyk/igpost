// ─── 外部請求 ───────────────────────────────────────────────────────────────

export interface PublishRequest {
  record_id: string;
  title: string;
  caption: string;
  image_url: string;
}

export interface UpdateRecordRequest {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface BotNotifyRequest {
  title: string;
  content: string;
  record_id?: string;
  success: boolean;
}

// ─── Instagram ───────────────────────────────────────────────────────────────

export type IgContainerStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "ERROR"
  | "EXPIRED"
  | "PUBLISHED";

export interface IgCreateContainerResponse {
  id: string;
}

export interface IgContainerStatusResponse {
  status_code: IgContainerStatus;
  id: string;
}

export interface IgPublishResponse {
  id: string;
}

// ─── Lark ────────────────────────────────────────────────────────────────────

export interface LarkTenantTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

export interface LarkUpdateRecordResponse {
  code: number;
  msg: string;
}

// ─── API 回應 ────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  detail?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
