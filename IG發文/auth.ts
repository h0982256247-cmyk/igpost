/**
 * 驗證 Authorization header 是否符合 Bearer <WEBHOOK_SECRET>
 */
export function validateAuth(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[auth] WEBHOOK_SECRET 環境變數未設定");
    return false;
  }

  const expected = `Bearer ${secret}`;
  return authHeader === expected;
}
