// ─────────────────────────────────────────────────────────────────────────────
// CRM Zalo Service
// Đăng nhập CRM → lấy Set-Cookie từ response → gửi campaign Zalo qua API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đăng nhập vào CRM và lấy cookie từ Set-Cookie header.
 * @returns {Promise<string>} Chuỗi cookie sẽ dùng trong header Cookie của request tiếp theo
 */
let cachedCrmCookie = null;

export const loginCRM = async () => {
  const email = process.env.ADMIN_EMAIL_CRM?.trim();
  const password = process.env.ADMIN_PASSWORD_CRM?.trim();
  const baseUrl = process.env.CRM_API_BASE_URL?.trim();

  if (!email || !password || !baseUrl) {
    throw new Error("[CRM] Thiếu ADMIN_EMAIL_CRM hoặc ADMIN_PASSWORD_CRM hoặc CRM_API_BASE_URL trong .env");
  }

  const response = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[CRM] Login thất bại (${response.status}): ${text}`);
  }

  // CRM set auth qua Set-Cookie header (không trả trong body)
  // Node.js fetch trả về tất cả Set-Cookie dưới dạng mảng qua getSetCookie()
  // hoặc header "set-cookie" (giá trị ghép bằng dấu phẩy)
  let rawSetCookies = [];

  // Cách 1: getSetCookie() - Node.js 18+ native fetch (đúng nhất, không bị merge)
  if (typeof response.headers.getSetCookie === "function") {
    rawSetCookies = response.headers.getSetCookie();
  }
  // Cách 2: duyệt qua entries() để bắt tất cả Set-Cookie headers
  if (rawSetCookies.length === 0 && typeof response.headers.entries === "function") {
    for (const [key, val] of response.headers.entries()) {
      if (key.toLowerCase() === "set-cookie") rawSetCookies.push(val);
    }
  }
  // Cách 3: fallback - đọc header set-cookie đơn (có thể bị merge bằng dấu phẩy)
  if (rawSetCookies.length === 0) {
    const raw = response.headers.get("set-cookie");
    if (raw) rawSetCookies = raw.split(/,(?=\s*\w+=)/); // tách theo dấu phẩy giữa các cookie
  }

  console.log("[CRM/Debug] Set-Cookie headers:", rawSetCookies);

  if (!rawSetCookies || rawSetCookies.length === 0) {
    // Fallback: CRM trả token trong body (không qua Set-Cookie)
    const data = await response.json().catch(() => ({}));
    const token =
      data?.token ||
      data?.data?.token ||
      data?.access_token ||
      data?.data?.access_token;

    if (!token) {
      throw new Error("[CRM] Không tìm thấy Set-Cookie header hoặc token trong response");
    }

    const encodedToken = Buffer.from(token).toString("base64");

    // Lấy company_id: ưu tiên từ response body, sau đó env, cuối cùng mới default = 1
    const companyId =
      data?.company_id ??
      data?.data?.company_id ??
      data?.user?.company_id ??
      parseInt(process.env.CRM_COMPANY_ID ?? "1");
    const companyJson = JSON.stringify({ company_id: companyId });

    const cookieValue = `auth=${encodedToken}; company=${companyJson}`;
    console.log(`[CRM/Debug] Cookie từ body token (company_id=${companyId}):`, cookieValue.slice(0, 80) + "...");
    cachedCrmCookie = cookieValue;
    return cookieValue;
  }

  // Parse từng cookie, chỉ lấy phần "name=value" (bỏ các thuộc tính như Path, Expires, HttpOnly...)
  const cookieParts = rawSetCookies.map((c) => c.split(";")[0].trim());

  // Ghép thành chuỗi Cookie header
  const cookieStr = cookieParts.join("; ");
  console.log("[CRM/Debug] Cookie string:", cookieStr.slice(0, 120) + "...");
  cachedCrmCookie = cookieStr;
  return cookieStr;
};

/**
 * Gửi Zalo campaign sinh nhật qua CRM API.
 * @param {Object}   params
 * @param {string}   params.campaignName - Tên campaign
 * @param {string}   params.channelId    - ID kênh Zalo (từ env ID_ZALO_CRM)
 * @param {string}   params.content      - Nội dung lời chúc
 * @param {string[]} params.phones       - Mảng số điện thoại
 * @param {boolean}  isRetry             - Có phải đang retry sau khi 401 không
 * @returns {Promise<Object>} Response từ CRM API
 */
export const sendZaloCampaign = async ({ campaignName, channelId, content, phones }, isRetry = false) => {
  const baseUrl = process.env.CRM_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("[CRM] Thiếu CRM_API_BASE_URL trong .env");
  }

  if (!phones || phones.length === 0) {
    return { skipped: true, reason: "Không có số điện thoại" };
  }

  // Tự động gọi login nếu chưa có cookie trong RAM
  if (!cachedCrmCookie) {
    await loginCRM();
  }

  const phonesStr = phones.join("\n");

  const payload = {
    name: campaignName,
    channel_id: channelId,
    content: content,
    phones: phonesStr,
    recipient_source: "phones",
    send_all_friends: "false",
    friend_ids: [],
    attachments: [],
    scheduled_at: null,
    send_friend_request: false,
    friend_request_message: "",
  };

  const response = await fetch(`${baseUrl}/zalo-campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cachedCrmCookie,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  // Xử lý tự động retry khi cookie hết hạn (lỗi 401)
  if (response.status === 401 && !isRetry) {
    console.warn("[CRM/Zalo] Cookie có thể đã hết hạn (401), tiến hành login lại và thử lại...");
    cachedCrmCookie = null; // Xóa cache
    return sendZaloCampaign({ campaignName, channelId, content, phones }, true); // Thử lại 1 lần duy nhất
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`[CRM/Zalo] Gửi campaign thất bại (${response.status}): ${text}`);
  }

  return data;
};
