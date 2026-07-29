import api from "./api";

const getSchedule = async (params) => {
    const response = await api.get("/shifts/schedule", { params });
    return response.data;
};

const getMySchedule = async (params) => {
    const response = await api.get("/shifts/my-schedule", { params });
    return response.data;
};

const assignShifts = async (data) => {
    const response = await api.post("/shifts/assign", data);
    return response.data;
};

export {
    getSchedule,
    getMySchedule,
    assignShifts
};
