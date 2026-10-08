/**
 * Cache utility – wrap Redis get/set/invalidate
 * Tự động fallback (không throw) nếu Redis chưa kết nối.
 *
 * TTL mặc định theo từng loại data:
 *   - Dữ liệu tĩnh (company, role, position, department): 10 phút
 *   - Dữ liệu bán tĩnh (employee list): 5 phút
 *   - Dữ liệu động (attendance, schedule): 2 phút
 */

import { getRedisClient } from "../config/redis.js";

// ─── TTL presets (giây) ───────────────────────────────────────────────────────
export const TTL = {
  STATIC: 10 * 60,       // 10 phút – công ty, vai trò, chức danh, phòng ban
  SEMI_STATIC: 5 * 60,   // 5 phút  – danh sách nhân viên
  DYNAMIC: 2 * 60,       // 2 phút  – lịch chấm công, phân ca
};

// ─── Lấy giá trị từ cache ─────────────────────────────────────────────────────
export const cacheGet = async (key) => {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Cache] GET lỗi key="${key}":`, err.message);
    return null;
  }
};

// ─── Lưu giá trị vào cache ────────────────────────────────────────────────────
export const cacheSet = async (key, value, ttlSeconds = TTL.SEMI_STATIC) => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error(`[Cache] SET lỗi key="${key}":`, err.message);
  }
};

// ─── Xóa một key ─────────────────────────────────────────────────────────────
export const cacheDel = async (key) => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Cache] DEL lỗi key="${key}":`, err.message);
  }
};

// ─── Xóa nhiều keys theo pattern (dùng SCAN để an toàn) ─────────────────────
export const cacheDelPattern = async (pattern) => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(`[Cache] DEL pattern="${pattern}" lỗi:`, err.message);
  }
};

/**
 * Cache-aside helper: nếu cache hit → trả về ngay,
 * nếu miss → gọi fetchFn(), lưu vào cache rồi trả về.
 * Nếu key = null → bỏ qua cache, gọi thẳng fetchFn().
 *
 * @param {string|null} key
 * @param {Function}    fetchFn   – async function không nhận tham số
 * @param {number}      ttl       – giây
 */
export const cacheWrap = async (key, fetchFn, ttl = TTL.SEMI_STATIC) => {
  if (key === null) return fetchFn(); // Bypass cache

  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await cacheSet(key, data, ttl);
  return data;
};
