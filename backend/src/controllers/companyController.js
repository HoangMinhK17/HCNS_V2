import Company from "../models/Company.js";

export const getAll = async (req, res) => {
  try {
    const companies = await Company.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: companies });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await Company.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy công ty" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    const exists = await Company.findOne({ code: req.body.code, deletedAt: null });
    if (exists) return res.status(400).json({ success: false, message: "Mã công ty đã tồn tại" });
    const doc = await Company.create(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const update = async (req, res) => {
  try {
    const doc = await Company.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy công ty" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const doc = await Company.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "inactive" } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy công ty" });
    return res.status(200).json({ success: true, message: "Đã xóa công ty" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
