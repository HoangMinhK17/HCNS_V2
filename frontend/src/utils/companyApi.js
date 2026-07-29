import api from "./api";

const getAllCompanies = async () => {
    const response = await api.get("/companies");
    return response.data;
};

const getCompanyById = async (id) => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
};

const createCompany = async (data) => {
    const response = await api.post("/companies", data);
    return response.data;
};

const updateCompany = async (id, data) => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
};

const deleteCompany = async (id) => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
};

export {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};
