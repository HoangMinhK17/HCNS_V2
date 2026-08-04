import BirthDay from "../models/BirthDay.js";

const createWishBirth = async (req, res) => {
    try {
        const { birthDayWish, gender } = req.body;
        const birthDay = new BirthDay({ birthDayWish, gender });
        await birthDay.save();
        res.status(201).json({ success: true, message: "BirthDay created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create BirthDay" });
    }
}

const getWishBirth = async (req, res) => {
    try {
        const birthDays = await BirthDay.find();
        res.status(200).json({ success: true, data: birthDays });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get BirthDay" });
    }
}

const updateWishBirth = async (req, res) => {
    try {
        const { id } = req.params;
        const { birthDayWish, gender } = req.body;
        const birthDay = await BirthDay.findByIdAndUpdate(id, { birthDayWish, gender }, { new: true });
        res.status(200).json({ success: true, message: "BirthDay updated successfully", data: birthDay });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update BirthDay" });
    }
}

const deleteWishBirth = async (req, res) => {
    try {
        const { id } = req.params;
        await BirthDay.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "BirthDay deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete BirthDay" });
    }
}

export {
    createWishBirth,
    getWishBirth,
    updateWishBirth,
    deleteWishBirth
}