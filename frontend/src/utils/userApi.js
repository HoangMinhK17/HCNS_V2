import api from "./api";

const login = async (username, password) => {
    const response = await api.post("/users/login", { username, password });
    return response.data;
};

const logout = async () => {
    const response = await api.post("/users/logout");
    return response.data;
};

const refreshToken = async (refreshToken) => {
    const response = await api.post("/users/refresh-token", { refreshToken });
    return response.data;
};

const getUsers = async (params) => {
    const response = await api.get("/users", { params });
    return response.data;
};

const getUserById = async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
};

const createUser = async (data) => {
    const response = await api.post("/users/create-account", data);
    return response.data;
};

const updateUser = async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
};

const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

const assignRole = async (id, roleId, roleCode) => {
    const response = await api.put(`/users/${id}/role`, { roleId, roleCode });
    return response.data;
};

export {
    login,
    logout,
    refreshToken,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
};
