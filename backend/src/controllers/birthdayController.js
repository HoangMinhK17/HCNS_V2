import BirthDay from "../models/BirthDay.js";

const createWishBirth = async (req, res) => {
    try {
        const { birthDayWish, gender } = req.body;
        const checkGender = await BirthDay.findOne({gender});
        if(checkGender){
            return res.status(400).json({ success: false, message: "Đã được tạo lời chúc cho giới tính này" });
        }
        const birthDay = new BirthDay({ birthDayWish, gender });
        await birthDay.save();
        res.status(201).json({ success: true, message: "Tạo lời chúc thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Tạo lời chúc thất bại" });
    }
}

const getWishBirth = async (req, res) => {
    try {
        const birthDays = await BirthDay.find();
        res.status(200).json({ success: true, data: birthDays });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lấy lời chúc thất bại" });
    }
}

const updateWishBirth = async (req, res) => {
    try {
        const { id } = req.params;
        const { birthDayWish, gender } = req.body;
        const birthDay = await BirthDay.findByIdAndUpdate(id, { birthDayWish, gender }, { new: true });
        res.status(200).json({ success: true, message: "Cập nhật lời chúc thành công", data: birthDay });
    } catch (error) {
        res.status(500).json({ success: false, message: "Cập nhật lời chúc thất bại" });
    }
}

const deleteWishBirth = async (req, res) => {
    try {
        const { id } = req.params;
        await BirthDay.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Xóa lời chúc thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Xóa lời chúc thất bại" });
    }
}

export {
    createWishBirth,
    getWishBirth,
    updateWishBirth,
    deleteWishBirth
}