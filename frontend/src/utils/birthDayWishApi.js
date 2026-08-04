import api from "./api.js";

const getWishBirths = async () => {
    const res = await api.get("/birthday/getWishBirth");
    return res.data;
};

const getWishBirthById = async (id) => {
    const res = await api.get(`/birthday/getWishBirth/${id}`);
    return res.data;
};

const createWishBirth = async (data) => {
    const res = await api.post("/birthday/createWishBirth", data);
    return res.data;
};

const updateWishBirth = async (id, data) => {
    const res = await api.put(`/birthday/updateWishBirth/${id}`, data);
    return res.data;
};

const deleteWishBirth = async (id) => {
    const res = await api.delete(`/birthday/deleteWishBirth/${id}`);
    return res.data;
};

export default { getWishBirths, getWishBirthById, createWishBirth, updateWishBirth, deleteWishBirth };