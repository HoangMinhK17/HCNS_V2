import api from "./api";

const checkIn = async (data) => {
    const response = await api.post("/attendance/checkin", data);
    return response.data;
};

const checkOut = async (data) => {
    const response = await api.post("/attendance/checkout", data);
    return response.data;
};

const getMyToday = async () => {
    const response = await api.get("/attendance/my-today");
    return response.data;
};

const getAttendanceSummary = async (params) => {
    const response = await api.get("/attendance/summary", { params });
    return response.data;
};

const registerFace = async (data) => {
    const response = await api.post("/attendance/register-face", data);
    return response.data;
};

const manualEditSummary = async (summaryId, data) => {
    const response = await api.put(`/attendance/summary/${summaryId}/manual`, data);
    return response.data;
};

export {
    checkIn,
    checkOut,
    getMyToday,
    getAttendanceSummary,
    registerFace,
    manualEditSummary
};
