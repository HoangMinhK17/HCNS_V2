import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

/**
 * Tạo store cho rate-limit.
 * - Nếu Redis sẵn sàng  → dùng RedisStore (chia sẻ state giữa nhiều instance).
 * - Nếu Redis chưa kết nối → fallback về MemoryStore (in-process, đủ dùng cho 1 server).
 *
 * Lưu ý: sendCommand được truyền vào để rate-limit-redis gọi raw Redis commands.
 */
const buildStore = (prefix) => {
  const redis = getRedisClient();
  if (!redis) return undefined; // undefined → express-rate-limit tự dùng MemoryStore

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // rate-limit-redis v4 yêu cầu sendCommand là hàm async gọi raw commands
    sendCommand: (...args) => redis.call(...args),
  });
};

import jwt from "jsonwebtoken";

/**
 * Key generator thông minh:
 * - Nếu request có Bearer Token -> lấy userId từ token giải mã (mỗi tài khoản có hạn mức riêng).
 * - Nếu chưa đăng nhập -> tính theo địa chỉ IP chuẩn hóa.
 */
const getKey = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token);
      if (decoded?.id) {
        return `user:${decoded.id}`;
      }
    }
  } catch (e) {
    // Bỏ qua nếu token parse lỗi, fallback về IP
  }
  return req.ip;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL RATE LIMIT
//    Áp dụng cho toàn bộ /api/v1/fumee/*
//    500 request / 1 phút / (User hoặc IP)
// ─────────────────────────────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 phút
  limit: 500,                    // 500 req/phút (rất thoải mái cho 1 tài khoản thao tác liên tục)
  standardHeaders: "draft-7",   // Trả về header RateLimit-* chuẩn
  legacyHeaders: false,
  keyGenerator: getKey,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  store: buildStore("global"),
  message: {
    success: false,
    message: "Bạn đang gửi quá nhiều yêu cầu cùng lúc. Vui lòng thử lại sau 1 phút.",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTH RATE LIMIT (chống brute-force login)
//    Áp dụng riêng cho POST /login, /refresh-token
//    10 request / 15 phút / 1 IP
// ─────────────────────────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 phút
  limit: 10,                     // 10 lần thử / 15 phút
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: buildStore("auth"),
  message: {
    success: false,
    message: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WRITE RATE LIMIT (chống spam tạo/sửa dữ liệu)
//    Áp dụng cho các POST/PUT/DELETE mutation quan trọng
//    30 request / 1 phút / 1 IP
// ─────────────────────────────────────────────────────────────────────────────
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 phút
  limit: 30,                     // 30 req/phút/IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: buildStore("write"),
  message: {
    success: false,
    message: "Quá nhiều thao tác. Vui lòng thử lại sau ít phút.",
  },
  // Chỉ áp dụng cho các method thay đổi dữ liệu
  skip: (req) => !["POST", "PUT", "DELETE", "PATCH"].includes(req.method),
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HEAVY OPERATION LIMITER (export Excel, scrape, AI, invoice PDF...)
//    5 request / 1 phút / 1 IP — cho các API nặng về tài nguyên
// ─────────────────────────────────────────────────────────────────────────────
export const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 phút
  limit: 5,                      // 5 req/phút/IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: buildStore("heavy"),
  message: {
    success: false,
    message: "Thao tác nặng đang bị giới hạn. Vui lòng chờ 1 phút rồi thử lại.",
  },
});
