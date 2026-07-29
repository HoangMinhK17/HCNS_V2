import Role, { ALL_PERMISSIONS } from "../models/Role.js";
import User from "../models/User.js";

export const getAll = async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null }).sort({ isSystem: -1, name: 1 }).lean();
    const ids = roles.map((r) => r._id);
    const counts = await User.aggregate([
      { $match: { role: { $in: ids }, deletedAt: null } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });
    const result = roles.map((r) => ({ ...r, userCount: countMap[r._id.toString()] || 0 }));
    return res.status(200).json({ success: true, data: result, allPermissions: ALL_PERMISSIONS });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await Role.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy role" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    const exists = await Role.findOne({ name: req.body.name, deletedAt: null });
    if (exists) return res.status(400).json({ success: false, message: "Tên role đã tồn tại" });
    const doc = await Role.create(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const update = async (req, res) => {
  try {
    const doc = await Role.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy role" });
    if (doc.isSystem && req.body.name && req.body.name !== doc.name) {
      return res.status(400).json({ success: false, message: "Không thể đổi tên role hệ thống" });
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const doc = await Role.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy role" });
    if (doc.isSystem) return res.status(400).json({ success: false, message: "Không thể xóa role hệ thống" });
    const userCount = await User.countDocuments({ role: req.params.id, deletedAt: null });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: `Role đang được gán cho ${userCount} người dùng` });
    }
    doc.deletedAt = new Date();
    await doc.save();
    return res.status(200).json({ success: true, message: "Đã xóa role" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const seedDefaultRoles = async (req, res) => {
  try {
    const defaults = [
      {
        name: "Super Admin",
        description: "Toàn quyền hệ thống",
        permissions: ALL_PERMISSIONS,
        isSystem: true,
      },
      {
        name: "HR Admin",
        description: "Quản trị nhân sự",
        permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("role:") && !p.startsWith("user:")),
        isSystem: true,
      },
      {
        name: "Manager",
        description: "Quản lý trực tiếp",
        permissions: ["employee:view", "department:view", "position:view", "orgchart:view", "report:view"],
        isSystem: true,
      },
      {
        name: "Employee",
        description: "Nhân viên tự phục vụ",
        permissions: ["employee:view", "orgchart:view"],
        isSystem: true,
      },
    ];

    const created = [];
    for (const r of defaults) {
      const exists = await Role.findOne({ name: r.name });
      if (!exists) {
        const doc = await Role.create(r);
        created.push(doc.name);
      }
    }
    return res.status(200).json({ success: true, message: `Đã tạo ${created.length} roles mặc định`, created });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
