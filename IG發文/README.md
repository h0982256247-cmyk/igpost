# Lark → Instagram Publisher

Lark 多維表格審核通過後，自動發布到 Instagram 的 API 服務。

## 快速開始

```bash
# 安裝依賴
npm install

# 複製環境變數
cp .env.example .env.local
# → 填入所有環境變數

# 開發模式
npm run dev

# 型別檢查
npm run type-check
```

## 部署到 Vercel

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel

# 設定環境變數（在 Vercel Dashboard 或 CLI）
vercel env add META_ACCESS_TOKEN
vercel env add IG_USER_ID
vercel env add LARK_APP_ID
vercel env add LARK_APP_SECRET
vercel env add LARK_APP_TOKEN
vercel env add LARK_TABLE_ID
vercel env add LARK_BOT_WEBHOOK_URL
vercel env add WEBHOOK_SECRET
```

## API 文件

### POST /api/ig/publish

主流程：接收 Lark 資料 → 發布 Instagram → 回寫 Lark + Bot 通知

**Headers**
```
Authorization: Bearer <WEBHOOK_SECRET>
Content-Type: application/json
```

**Request Body**
```json
{
  "record_id": "recXXXXXXXX",
  "title": "貼文標題",
  "caption": "貼文內文 #hashtag",
  "image_url": "https://example.com/image.jpg"
}
```

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "media_id": "17854360229135492",
    "post_url": "https://www.instagram.com/p/17854360229135492/"
  }
}
```

**Error Response**
```json
{
  "success": false,
  "error": "建立 Media Container 失敗",
  "detail": "Invalid image URL"
}
```

---

### POST /api/lark/update-record

更新 Lark Base 指定 Record 的欄位。

**Request Body**
```json
{
  "record_id": "recXXXXXXXX",
  "fields": {
    "發布狀態": "已發布",
    "Instagram_Media_ID": "17854360229135492"
  }
}
```

---

### POST /api/lark/bot-notify

發送 Lark Bot 通知。

**Request Body**
```json
{
  "title": "Instagram 發布成功",
  "content": "**貼文：** 標題\n**連結：** https://...",
  "success": true
}
```

---

## 測試指令（curl）

```bash
# 設定變數
BASE_URL="http://localhost:3000"
SECRET="your-webhook-secret"

# 測試發布
curl -X POST "$BASE_URL/api/ig/publish" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "record_id": "recXXXXXXXX",
    "title": "測試貼文",
    "caption": "這是測試貼文 #test",
    "image_url": "https://picsum.photos/1080/1080"
  }'

# 測試更新 Record
curl -X POST "$BASE_URL/api/lark/update-record" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "record_id": "recXXXXXXXX",
    "fields": { "發布狀態": "測試中" }
  }'

# 測試 Bot 通知
curl -X POST "$BASE_URL/api/lark/bot-notify" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "測試通知",
    "content": "這是來自 API 的測試通知",
    "success": true
  }'
```

## 注意事項

- `image_url` 必須是公開可存取的 URL，Instagram Graph API 會主動抓取圖片
- IG Media Container 處理時間約 5~30 秒，API 最長等待 30 秒（10 次 × 3 秒）
- `/api/ig/publish` 的 Vercel Function timeout 設定為 60 秒（見 `vercel.json`）
- Lark `tenant_access_token` 會在記憶體中快取，Serverless 環境每次 cold start 會重新取得
