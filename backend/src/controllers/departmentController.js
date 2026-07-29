import Department from "../models/Department.js";
import Employee from "../models/Employee.js";

export const getAll = async (req, res) => {
  try {
    const depts = await Department.find({ deletedAt: null })
      .populate("parent", "name code")
      .populate("company", "name code")
      .populate("manager", "fullName empCode")
      .sort({ order: 1, name: 1 })
      .lean();

    const ids = depts.map((d) => d._id);
    const counts = await Employee.aggregate([
      { $match: { department: { $in: ids }, deletedAt: null, status: { $ne: "inactive" } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });
    const result = depts.map((d) => ({
      ...d,
      currentHeadcount: countMap[d._id.toString()] || 0,
    }));

    if (req.query.tree === "true") {
      const tree = buildTree(result);
      return res.status(200).json({ success: true, data: tree });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await Department.findOne({ _id: req.params.id, deletedAt: null })
      .populate("parent", "name code")
      .populate("company", "name code")
      .populate("manager", "fullName empCode avatar")
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy phòng ban" });

    const currentHeadcount = await Employee.countDocuments({ department: doc._id, deletedAt: null, status: { $ne: "inactive" } });
    doc.currentHeadcount = currentHeadcount;

    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    if (req.body.code) {
      const exists = await Department.findOne({ code: req.body.code, deletedAt: null });
      if (exists) return res.status(400).json({ success: false, message: "Mã phòng ban đã tồn tại" });
    }
    const doc = await Department.create(req.body);
    const populated = await Department.findById(doc._id)
      .populate("parent", "name code")
      .populate("company", "name code")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const countEmployeesInDept = async (depId) => {
  return await Employee.countDocuments({ department: depId, deletedAt: null, status: { $ne: "inactive" } });
}

export const update = async (req, res) => {
  try {
    if (req.body.parent && req.body.parent === req.params.id) {
      return res.status(400).json({ success: false, message: "Phòng ban không thể là cha của chính nó" });
    }
    if (req.body.status == "inactive") {
      const count = await countEmployeesInDept(req.params.id);
      if (count > 0) {
        return res.status(400).json({ success: false, message: `Phòng ban không thể Ngừng hoạt động vì có ${count} nhân viên đang thuộc phòng ban này` });
      }
    }
    const doc = await Department.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    )
      .populate("parent", "name code")
      .populate("company", "name code")
      .populate("manager", "fullName empCode");
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy phòng ban" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const count = await countEmployeesInDept(req.params.id);
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa: Phòng ban vẫn còn ${count} nhân viên`,
      });
    }
    const childCount = await Department.countDocuments({ parent: req.params.id, deletedAt: null });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa: Phòng ban còn ${childCount} phòng ban con`,
      });
    }
    const doc = await Department.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "inactive" } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy phòng ban" });
    return res.status(200).json({ success: true, message: "Đã xóa phòng ban" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

function buildTree(items) {
  const map = {};
  const roots = [];
  items.forEach((item) => {
    map[item._id] = { ...item, children: [] };
  });
  items.forEach((item) => {
    const parentId = item.parent?._id || item.parent;
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[item._id]);
    } else {
      roots.push(map[item._id]);
    }
  });
  return roots;
}
