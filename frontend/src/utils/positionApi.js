import api from "./api";

const getAllPositions = async (params) => {
    const response = await api.get("/positions", { params });
    return response.data;
};

const getPositionById = async (id) => {
    const response = await api.get(`/positions/${id}`);
    return response.data;
};

const createPosition = async (data) => {
    const response = await api.post("/positions", data);
    return response.data;
};

const updatePosition = async (id, data) => {
    const response = await api.put(`/positions/${id}`, data);
    return response.data;
};

const deletePosition = async (id) => {
    const response = await api.delete(`/positions/${id}`);
    return response.data;
};

// backward-compat
const getPositionsByIds = async (ids) => {
    const response = await api.post("/positions/get-by-ids", { ids });
    return response.data;
};

export {
    getAllPositions,
    getPositionById,
    createPosition,
    updatePosition,
    deletePosition,
    getPositionsByIds
};
