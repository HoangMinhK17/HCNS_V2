/**
 * dateUtils.js – Tiện ích tính ngày làm việc
 * Dùng để: tính số ngày nghỉ phép thực tế, kiểm tra ngày lễ
 */

import HolidayCalendar from "../models/HolidayCalendar.js";

/**
 * Normalize một Date về đầu ngày (00:00:00.000) theo UTC+7 (Vietnam)
 * @param {Date|string} date
 * @returns {Date}
 */
export function normalizeToStartOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Kiểm tra có phải cuối tuần (T7, CN) không
 * @param {Date} date
 * @returns {boolean}
 */
export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6; // 0 = CN, 6 = T7
}

/**
 * Lấy danh sách ngày lễ trong khoảng thời gian (theo công ty)
 * @param {string} companyId
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Promise<Set<string>>} Set các date string 'YYYY-MM-DD'
 */
export async function getHolidaySet(companyId, fromDate, toDate) {
  const fromYear = new Date(fromDate).getFullYear();
  const toYear = new Date(toDate).getFullYear();

  const holidays = await HolidayCalendar.find({
    company: companyId,
    $or: [
      // Lễ cố định theo năm cụ thể
      { date: { $gte: fromDate, $lte: toDate }, isRecurringYearly: false },
      // Lễ lặp lại hàng năm (chỉ xét tháng/ngày)
      { isRecurringYearly: true },
    ],
    isActive: { $ne: false },
  }).lean();

  const holidaySet = new Set();

  for (const h of holidays) {
    if (h.isRecurringYearly) {
      // Áp dụng cho mỗi năm trong khoảng
      for (let y = fromYear; y <= toYear; y++) {
        const d = new Date(h.date);
        const recurring = new Date(y, d.getMonth(), d.getDate());
        if (recurring >= fromDate && recurring <= toDate) {
          holidaySet.add(recurring.toISOString().split("T")[0]);
        }
      }
    } else {
      holidaySet.add(new Date(h.date).toISOString().split("T")[0]);
    }
  }

  return holidaySet;
}

/**
 * Tính số ngày làm việc thực tế giữa 2 ngày
 * Loại trừ: cuối tuần + ngày lễ
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {string} companyId
 * @param {string} halfDay - 'full' | 'morning' | 'afternoon'
 * @returns {Promise<number>}
 */
export async function countWorkingDays(
  fromDate,
  toDate,
  companyId,
  halfDay = "full"
) {
  const holidaySet = await getHolidaySet(companyId, fromDate, toDate);

  let count = 0;
  const current = new Date(fromDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(toDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    if (!isWeekend(current) && !holidaySet.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Nếu xin nửa ngày (chỉ valid khi fromDate = toDate)
  if (halfDay !== "full" && count === 1) {
    count = 0.5;
  }

  return count;
}

/**
 * Lấy tháng/năm dưới dạng { month, year }
 * @param {Date} date
 */
export function getMonthYear(date) {
  const d = new Date(date);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/**
 * Chuyển "HH:mm" thành số phút từ đầu ngày
 * @param {string} timeStr - "08:00"
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return h * 60 + m;
}
