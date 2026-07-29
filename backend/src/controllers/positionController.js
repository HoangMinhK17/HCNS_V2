import Position from "../models/Position.js";
import Employee from "../models/Employee.js";

export const getAll = async (req, res) => {
  try {
    const { department, status } = req.query;
    const filter = { deletedAt: null };
    if (department) filter.department = department;
    if (status) filter.status = status;

    const positions = await Position.find(filter)
      .populate("department", "name code")
      .populate("reportsTo", "name code")
      .populate("company", "name code")
      .sort({ name: 1 })
      .lean();

    const ids = positions.map((p) => p._id);
    const counts = await Employee.aggregate([
      { $match: { position: { $in: ids }, deletedAt: null, status: { $ne: "inactive" } } },
      { $group: { _id: "$position", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });
    const result = positions.map((p) => ({
      ...p,
      currentHeadcount: countMap[p._id.toString()] || 0,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await Position.findOne({ _id: req.params.id, deletedAt: null })
      .populate("department", "name code")
      .populate("reportsTo", "name code")
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy chức danh" });
    doc.currentHeadcount = await Employee.countDocuments({ position: doc._id, deletedAt: null });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    const doc = await Position.create(req.body);
    const populated = await Position.findById(doc._id)
      .populate("department", "name code")
      .populate("reportsTo", "name code")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const countEmployeesInPos = async (posId) => {
  return await Employee.countDocuments({ position: posId, deletedAt: null, status: { $ne: "inactive" } });
}

export const update = async (req, res) => {
  try {
    if (req.body.status == 'inactive') {
      const count = await countEmployeesInPos(req.params.id);
      if (count > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể Ngừng hoạt động chức danh vì đang có ${count} nhân viên`,
        });
      }
    }
    const doc = await Position.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    )
      .populate("department", "name code")
      .populate("reportsTo", "name code");
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy chức danh" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const count = await countEmployeesInPos(req.params.id);
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa chức danh vì đang có ${count} nhân viên`,
      });
    }
    const doc = await Position.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "inactive" } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy chức danh" });
    return res.status(200).json({ success: true, message: "Đã xóa chức danh" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


