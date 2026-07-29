import api from "./api";

const getAllDepartments = async (params) => {
    const response = await api.get("/departments", { params });
    return response.data;
};

const getDepartmentTree = async () => {
    const response = await api.get("/departments", { params: { tree: "true" } });
    return response.data;
};

const getDepartmentById = async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
};

const createDepartment = async (data) => {
    const response = await api.post("/departments", data);
    return response.data;
};

const updateDepartment = async (id, data) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
};

const deleteDepartment = async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
};

export {
    getAllDepartments,
    getDepartmentTree,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
