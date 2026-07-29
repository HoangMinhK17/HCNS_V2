import api from "./api";
const getAll = async () => {
    const response = await api.get("/roles/get-all-role-permissions");
    return response.data;
};
const getById = async (id) => {
    const response = await api.get(`/roles/get-by-id/${id}`);
    return response.data;
};
const create = async (data) => {
    const response = await api.post("/roles/create", data);
    return response.data;
};
const update = async (id, data) => {
    const response = await api.put(`/roles/update/${id}`, data);
    return response.data;
};
const remove = async (id) => {
    const response = await api.delete(`/roles/remove/${id}`);
    return response.data;
};
export { getAll, getById, create, update, remove };