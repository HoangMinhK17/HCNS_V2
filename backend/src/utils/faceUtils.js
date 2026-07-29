/**
 * faceUtils.js – Tiện ích xác thực khuôn mặt (server-side)
 *
 * face-api.js chạy trên CLIENT (browser) để:
 *   1. Detect khuôn mặt từ camera
 *   2. Extract face descriptor (Float32Array 128 chiều)
 *
 * SERVER chịu trách nhiệm:
 *   1. Nhận descriptor từ client
 *   2. So sánh Euclidean distance với descriptor đã đăng ký trong DB
 *   3. Trả về { verified, distance, score }
 *
 * Ngưỡng chuẩn face-api.js:
 *   - distance < 0.5 → cùng người (high confidence)
 *   - distance 0.5–0.6 → không chắc chắn
 *   - distance > 0.6 → khác người
 */

const FACE_MATCH_THRESHOLD = 0.5; // Ngưỡng mặc định, có thể cấu hình

/**
 * Tính Euclidean distance giữa 2 face descriptors
 * @param {number[]} descriptor1 - Mảng 128 số float
 * @param {number[]} descriptor2 - Mảng 128 số float
 * @returns {number} Euclidean distance (càng nhỏ càng giống)
 */
export function euclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) return Infinity;
  if (descriptor1.length !== descriptor2.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Xác thực khuôn mặt check-in với embedding đã đăng ký
 * @param {number[]} checkinDescriptor - Descriptor lúc check-in (từ client)
 * @param {number[]} registeredEmbedding - Embedding đã lưu trong Employee
 * @param {number} threshold - Ngưỡng chấp nhận (mặc định 0.5)
 * @returns {{ verified: boolean, distance: number, score: number }}
 */
export function verifyFace(
  checkinDescriptor,
  registeredEmbedding,
  threshold = FACE_MATCH_THRESHOLD
) {
  if (!registeredEmbedding || registeredEmbedding.length === 0) {
    return {
      verified: false,
      distance: null,
      score: 0,
      reason: "Nhân viên chưa đăng ký khuôn mặt",
    };
  }

  if (!checkinDescriptor || checkinDescriptor.length === 0) {
    return {
      verified: false,
      distance: null,
      score: 0,
      reason: "Không phát hiện khuôn mặt khi check-in",
    };
  }

  const distance = euclideanDistance(checkinDescriptor, registeredEmbedding);
  // Score ngược: càng gần 1 càng giống
  const score = Math.max(0, Math.min(1, 1 - distance / threshold));
  const verified = distance < threshold;

  return {
    verified,
    distance: Math.round(distance * 1000) / 1000, // 3 decimal places
    score: Math.round(score * 100) / 100,
    reason: verified ? null : `Khuôn mặt không khớp (distance: ${distance.toFixed(3)})`,
  };
}

/**
 * Validate descriptor hợp lệ (128 chiều, tất cả là số)
 * @param {any} descriptor
 * @returns {boolean}
 */
export function isValidDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === 128 &&
    descriptor.every((v) => typeof v === "number" && !isNaN(v))
  );
}
