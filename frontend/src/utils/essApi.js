import api from "./api";

// ── Leave ─────────────────────────────────────────────────────
const getLeaveTypes = async () => {
    const response = await api.get("/ess/leave/types");
    return response.data;
};

const createLeaveType = async (data) => {
    const response = await api.post("/ess/leave/types", data);
    return response.data;
};

const updateLeaveType = async (id, data) => {
    const response = await api.put(`/ess/leave/types/${id}`, data);
    return response.data;
};

const getMyLeaveBalance = async (params) => {
    const response = await api.get("/ess/leave/balance", { params });
    return response.data;
};

const initLeaveBalance = async (data) => {
    const response = await api.post("/ess/leave/balance/init", data);
    return response.data;
};

const createLeaveRequest = async (data) => {
    const response = await api.post("/ess/leave", data);
    return response.data;
};

const getMyLeaveRequests = async (params) => {
    const response = await api.get("/ess/leave/my-requests", { params });
    return response.data;
};

// ── Overtime ──────────────────────────────────────────────────
const createOvertimeRequest = async (data) => {
    const response = await api.post("/ess/overtime", data);
    return response.data;
};

const getMyOvertimeRequests = async (params) => {
    const response = await api.get("/ess/overtime/my-requests", { params });
    return response.data;
};

// ── Asset ─────────────────────────────────────────────────────
const createAssetRequest = async (data) => {
    const response = await api.post("/ess/asset", data);
    return response.data;
};

const getMyAssetRequests = async (params) => {
    const response = await api.get("/ess/asset/my-requests", { params });
    return response.data;
};

const fulfillAsset = async (id, data) => {
    const response = await api.put(`/ess/asset/${id}/fulfill`, data);
    return response.data;
};

// ── Approval ──────────────────────────────────────────────────
const submitRequest = async (type, id) => {
    const response = await api.post(`/ess/${type}/${id}/submit`);
    return response.data;
};

const approveRequest = async (type, id, data) => {
    const response = await api.post(`/ess/${type}/${id}/approve`, data);
    return response.data;
};

const rejectRequest = async (type, id, data) => {
    const response = await api.post(`/ess/${type}/${id}/approve`, { action: 'rejected', ...data });
    return response.data;
};

const cancelRequest = async (type, id, data) => {
    const response = await api.post(`/ess/${type}/${id}/cancel`, data);
    return response.data;
};

const getPendingApprovals = async () => {
    const response = await api.get("/ess/approvals/pending");
    return response.data;
};

const getMyRequests = async (params) => {
    const response = await api.get("/ess/approvals/my-requests", { params });
    return response.data;
};

export {
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    getMyLeaveBalance,
    initLeaveBalance,
    createLeaveRequest,
    getMyLeaveRequests,
    createOvertimeRequest,
    getMyOvertimeRequests,
    createAssetRequest,
    getMyAssetRequests,
    fulfillAsset,
    submitRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    getPendingApprovals,
    getMyRequests
};
