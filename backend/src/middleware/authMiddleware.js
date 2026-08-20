import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .populate("role", "name permissions")
      .select("-password")
      .lean();

    if (!user || user.deletedAt) {
      return res.status(401).json({ success: false, message: "User không tồn tại" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Tài khoản đã bị vô hiệu hóa" });
    }

    if (user) {
      user.companyId = user.company;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token đã hết hạn", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
};

export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRoleCode = req.user?.roleCode;
    if (!allowedRoles.includes(userRoleCode)) {
      return res.status(403).json({
        success: false,
        message: `Không có quyền truy cập. Yêu cầu role: ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const user = req.user;
    if (user?.roleCode === "super-admin") {
      return next();
    }

    const userPermissions = user?.role?.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện chức năng này (${requiredPermission})`,
      });
    }
    next();
  };
};
