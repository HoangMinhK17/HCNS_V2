import api from "./api";

const getEmployees = async (params) => {
    const response = await api.get("/employees", { params });
    return response.data;
};

const getAllEmployeesForDropdown = async () => {
    const response = await api.get("/employees/all-employees-for-dropdown");
    return response.data;
};

const getEmployeeById = async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
};

const getEmployeesByIds = async (ids) => {
    const response = await api.post("/employees/get-by-ids", { ids });
    return response.data;
};

const createEmployee = async (data) => {
    const response = await api.post("/employees", data);
    return response.data;
};

const updateEmployee = async (id, data) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
};

const deleteEmployee = async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
};

const addWorkHistory = async (id, data) => {
    const response = await api.post(`/employees/${id}/work-history`, data);
    return response.data;
};

const exportEmployees = async () => {
    const response = await api.get("/employees/export", { responseType: "blob" });
    return response.data;
};

const getExpiringContracts = async (days = 30) => {
    const response = await api.get(`/employees/expiring?days=${days}`);
    return response.data;
};

const downloadTemplate = async () => {
    const response = await api.get("/employees/template", { responseType: "blob" });
    return response.data;
};

const importEmployees = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post("/employees/import", form, { 
        headers: { "Content-Type": "multipart/form-data" } 
    });
    return response.data;
};

const getOrgChart = async () => {
    const response = await api.get("/employees/org-chart");
    return response.data;
};

const getBirthdays = async (days = 30) => {
    const response = await api.get(`/employees/birthday?days=${days}`);
    return response.data;
};
export {
    getEmployees,
    getAllEmployeesForDropdown,
    getEmployeeById,
    getEmployeesByIds,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    addWorkHistory,
    exportEmployees,
    getExpiringContracts,
    downloadTemplate,
    importEmployees,
    getOrgChart,
    getBirthdays
};
