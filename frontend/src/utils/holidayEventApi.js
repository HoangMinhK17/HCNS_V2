import api from "./api.js";

const BASE = "/holiday-events";

export const getHolidayEvents = async (params = {}) => {
  const res = await api.get(BASE, { params });
  return res.data;
};

export const createHolidayEvent = async (data) => {
  const res = await api.post(BASE, data);
  return res.data;
};

export const updateHolidayEvent = async (id, data) => {
  const res = await api.put(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteHolidayEvent = async (id) => {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
};

export const triggerHolidayEvent = async (id, type = "both") => {
  const res = await api.post(`${BASE}/${id}/trigger`, null, { params: { type } });
  return res.data;
};
