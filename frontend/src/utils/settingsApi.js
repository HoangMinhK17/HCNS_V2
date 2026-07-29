import api from "./api";

const getLocations = async () => {
    const response = await api.get("/settings/locations");
    return response.data;
};

const createLocation = async (data) => {
    const response = await api.post("/settings/locations", data);
    return response.data;
};

const updateLocation = async (id, data) => {
    const response = await api.put(`/settings/locations/${id}`, data);
    return response.data;
};

const deleteLocation = async (id) => {
    const response = await api.delete(`/settings/locations/${id}`);
    return response.data;
};

const getHolidays = async (params) => {
    const response = await api.get("/settings/holidays", { params });
    return response.data;
};

const createHoliday = async (data) => {
    const response = await api.post("/settings/holidays", data);
    return response.data;
};

const updateHoliday = async (id, data) => {
    const response = await api.put(`/settings/holidays/${id}`, data);
    return response.data;
};

const deleteHoliday = async (id) => {
    const response = await api.delete(`/settings/holidays/${id}`);
    return response.data;
};

const getApprovalFlows = async () => {
    const response = await api.get("/settings/approval-flows");
    return response.data;
};

const createApprovalFlow = async (data) => {
    const response = await api.post("/settings/approval-flows", data);
    return response.data;
};

const updateApprovalFlow = async (id, data) => {
    const response = await api.put(`/settings/approval-flows/${id}`, data);
    return response.data;
};

const deleteApprovalFlow = async (id) => {
    const response = await api.delete(`/settings/approval-flows/${id}`);
    return response.data;
};

export {
    getLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    getApprovalFlows,
    createApprovalFlow,
    updateApprovalFlow,
    deleteApprovalFlow
};
