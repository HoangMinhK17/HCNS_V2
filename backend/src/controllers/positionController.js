import Position from "../models/Position.js";
import Employee from "../models/Employee.js";
import { cacheWrap, cacheDel, cacheDelPattern, TTL } from "../utils/cache.js";

// ─── Cache keys ───────────────────────────────────────────────────────────────
const KEY_ALL = (q) => `position:all:${JSON.stringify(q)}`;
const KEY_ID = (id) => `position:${id}`;

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export const getAll = async (req, res) => {
  try {
    const { department, status } = req.query;
    const data = await cacheWrap(
      KEY_ALL({ department, status }),
      async () => {
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
        return positions.map((p) => ({
          ...p,
          currentHeadcount: countMap[p._id.toString()] || 0,
        }));
      },
      TTL.STATIC
    );

    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
export const getById = async (req, res) => {
  try {
    const data = await cacheWrap(
      KEY_ID(req.params.id),
      async () => {
        const doc = await Position.findOne({ _id: req.params.id, deletedAt: null })
          .populate("department", "name code")
          .populate("reportsTo", "name code")
          .lean();
        if (!doc) return null;
        doc.currentHeadcount = await Employee.countDocuments({ position: doc._id, deletedAt: null });
        return doc;
      },
      TTL.STATIC
    );

    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy chức danh" });
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const create = async (req, res) => {
  try {
    const doc = await Position.create(req.body);
    const populated = await Position.findById(doc._id)
      .populate("department", "name code")
      .populate("reportsTo", "name code")
      .lean();

    // Xóa toàn bộ cache position:all:*
    await cacheDelPattern("position:all:*");
    return res.status(201).json({ success: true, data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const countEmployeesInPos = async (posId) => {
  return await Employee.countDocuments({ position: posId, deletedAt: null, status: { $ne: "inactive" } });
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
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

    // Invalidate cache
    await Promise.all([cacheDelPattern("position:all:*"), cacheDel(KEY_ID(req.params.id))]);
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
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

    // Invalidate cache
    await Promise.all([cacheDelPattern("position:all:*"), cacheDel(KEY_ID(req.params.id))]);
    return res.status(200).json({ success: true, message: "Đã xóa chức danh" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
