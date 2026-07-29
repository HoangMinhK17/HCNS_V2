/**
 * gpsUtils.js – Tiện ích tính khoảng cách GPS (Haversine formula)
 * Dùng để kiểm tra check-in có trong bán kính cho phép không
 */

const EARTH_RADIUS_METERS = 6_371_000; // bán kính Trái Đất (mét)

/**
 * Tính khoảng cách (mét) giữa 2 tọa độ GPS
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} khoảng cách tính bằng mét
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Tìm văn phòng gần nhất và kiểm tra xem có trong vùng cho phép không
 * @param {number} lat - Vĩ độ của nhân viên
 * @param {number} lon - Kinh độ của nhân viên
 * @param {Array} locations - Danh sách CompanyLocation
 * @returns {{ location, distance, isWithin, allowedRadius }}
 */
export function findNearestLocation(lat, lon, locations) {
  if (!locations || locations.length === 0) {
    return { location: null, distance: null, isWithin: false, allowedRadius: 0 };
  }

  let nearest = null;
  let minDistance = Infinity;

  for (const loc of locations) {
    const dist = haversineDistance(lat, lon, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  const allowedRadius = nearest?.allowedRadius ?? 100;
  return {
    location: nearest,
    distance: Math.round(minDistance), // làm tròn tới mét
    isWithin: minDistance <= allowedRadius,
    allowedRadius,
  };
}

/**
 * Kiểm tra GPS có hợp lệ (accuracy đủ tốt) không
 * @param {number} accuracy - Độ chính xác GPS của browser (mét)
 * @param {number} maxAccuracy - Ngưỡng chấp nhận (mặc định 50m)
 */
export function isGpsAccuracyAcceptable(accuracy, maxAccuracy = 50) {
  if (accuracy == null) return true; // bỏ qua nếu không có thông tin
  return accuracy <= maxAccuracy;
}
