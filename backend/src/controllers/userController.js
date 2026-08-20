import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, roleCode: user.roleCode },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET_REFRESH,
    { expiresIn: process.env.JWT_EXPIRES_IN_REFRESH || "7d" }
  );

export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const filter = { deletedAt: null };
    if (search.trim()) {
      filter.$or = [
        { username: { $regex: search.trim(), $options: "i" } },
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .populate("role", "name permissions")
        .populate("employee", "fullName empCode avatar department position")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);
    return res.status(200).json({
      success: true, data: users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await User.findOne({ _id: req.params.id, deletedAt: null })
      .populate("role", "name permissions")
      .populate("employee", "fullName empCode")
      .select("-password")
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    return res.json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    const { username, email, password, employee, } = req.body;
    const exists = await User.findOne({ $or: [{ username }, { email }], deletedAt: null });
    if (exists) return res.status(400).json({ success: false, message: "Username hoặc email đã tồn tại" });
    const checkEmp = await User.findOne({ employee })
    if (checkEmp) {
      return res.status(400).json({ success: false, message: "Nhân viên đã có tài khoản" });
    }
    const checkCompanyId = await Employee.findOne({ _id: employee, });
    if (!checkCompanyId.company) {
      return res.status(400).json({ success: false, message: "Nhân viên chưa được gán công ty" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const doc = await User.create({ ...req.body, password: hashedPassword, company: checkCompanyId.company });
    const result = doc.toObject();
    delete result.password;
    return res.status(201).json({ success: true, data: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const update = async (req, res) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, deletedAt: null });
    if (!targetUser) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const updateData = { ...req.body };

    if (updateData.isActive !== targetUser.isActive && req.user._id.toString() === req.params.id.toString()) {
      return res.status(403).json({ success: false, message: "Không có quyền thay đổi trạng thái tài khoản của chính mình" })
    }

    const isTargetSuperAdmin = targetUser.roleCode === "super-admin";
    const isCurrentSuperAdmin = req.user.roleCode === "super-admin";

    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      if (updateData.password) {
        return res.status(403).json({ success: false, message: "Không có quyền thay đổi mật khẩu của tài khoản Super Admin" });
      }
      if (updateData.employee) {
        return res.status(403).json({ success: false, message: "Không có quyền thay đổi nhân viên liên kết của tài khoản Super Admin" });
      }
      if (updateData.isActive !== undefined) {
        return res.status(403).json({ success: false, message: "Không có quyền thay đổi trạng thái tài khoản Super Admin" });
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }
    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    )
      .populate("role", "name permissions")
      .select("-password");
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, deletedAt: null });
    if (!targetUser) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const checkPassword = await bcrypt.compare(req.body.oldPassword, targetUser.password);
    if (!checkPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác" });
    }
    const updateData = { ...req.body };

    if (updateData.password === updateData.oldPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới và cũ không được giống nhau" });
    }
    const isTargetSuperAdmin = targetUser.roleCode === "super-admin";
    const isCurrentSuperAdmin = req.user.roleCode === "super-admin";

    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      if (updateData.password) {
        return res.status(403).json({ success: false, message: "Không có quyền thay đổi mật khẩu của tài khoản Super Admin" });
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }
    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    )
      .populate("role", "name permissions")
      .select("-password");
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, deletedAt: null });
    if (!targetUser) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    if (targetUser.roleCode === 'super-admin') {
      return res.status(403).json({ success: false, message: "Không được quyền xóa tài khoản Super Admin" })
    }

    if (req.user._id.toString() == req.params.id.toString()) {
      return res.status(403).json({ success: false, message: "Không được quyền xóa tài khoản của chính mình" })
    }

    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    return res.status(200).json({ success: true, message: "Đã xóa người dùng" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const assignRole = async (req, res) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, deletedAt: null });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    if (targetUser.roleCode == 'super-admin') {
      return res.status(403).json({ success: false, message: "Không được quyền hạ tài khoản Super Admin" })
    }

    if (req.body.roleCode == 'super-admin') {
      return res.status(403).json({ success: false, message: "Không thể tạo tài khoản với quyền Super Admin" })
    }

    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { role: req.body.roleId, roleCode: req.body.roleCode } },
      { returnDocument: 'after' }
    ).populate("role", "name permissions").select("-password");

    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      deletedAt: null,
    }).populate("role", "name permissions").lean();

    if (!user) {
      return res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const { password: _, __v, deletedAt, ...userInfo } = user;

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: { user: userInfo, accessToken, refreshToken },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: "Thiếu refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_REFRESH);
    const user = await User.findById(decoded.id)
      .populate("role", "name permissions")
      .lean();

    if (!user || user.deletedAt || !user.isActive) {
      return res.status(401).json({ success: false, message: "User không hợp lệ" });
    }

    const newAccessToken = generateAccessToken(user);
    return res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (e) {
    return res.status(401).json({ success: false, message: "Refresh token không hợp lệ hoặc đã hết hạn" });
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({ success: true, message: "Đăng xuất thành công" });
};
