import api from "./api.js";

const BASE = "/holiday-events";

/** Lấy danh sách sự kiện nghỉ lễ */
export const getHolidayEvents = async (params = {}) => {
  const res = await api.get(BASE, { params });
  return res.data;
};

/** Tạo sự kiện nghỉ lễ mới */
export const createHolidayEvent = async (data) => {
  const res = await api.post(BASE, data);
  return res.data;
};

/** Cập nhật sự kiện nghỉ lễ */
export const updateHolidayEvent = async (id, data) => {
  const res = await api.put(`${BASE}/${id}`, data);
  return res.data;
};

/** Xóa sự kiện nghỉ lễ */
export const deleteHolidayEvent = async (id) => {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
};

/**
 * Kích hoạt gửi thủ công (dùng để test mà không đợi cron)
 * @param {string} id
 * @param {"announcement"|"wish"|"both"} type
 */
export const triggerHolidayEvent = async (id, type = "both") => {
  const res = await api.post(`${BASE}/${id}/trigger`, null, { params: { type } });
  return res.data;
};
