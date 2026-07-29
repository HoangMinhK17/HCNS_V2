import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import Position from "../models/Position.js";
import ExcelJS from "exceljs";

const genEmpCode = async () => {
  const last = await Employee.findOne({}, { empCode: 1 }).sort({ createdAt: -1 }).lean();
  if (!last) return "NV001";
  const match = last.empCode?.match(/(\d+)$/);
  const num = match ? parseInt(match[1]) + 1 : 1;
  return `NV${String(num).padStart(3, "0")}`;
};

const POPULATE_OPTS = [
  { path: "department", select: "name code" },
  { path: "position", select: "name code level" },
  { path: "company", select: "name code" },
  { path: "reportsTo", select: "fullName empCode avatar" },
];

export const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      department,
      position,
      status,
      contractType,
      gender,
    } = req.query;

    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (position) filter.position = position;
    if (contractType) filter.contractType = contractType;
    if (gender) filter.gender = gender;
    if (search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { empCode: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, employees] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter)
        .populate(POPULATE_OPTS)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getAllNoPagination = async (req, res) => {
  try {
    const employees = await Employee.find({ deletedAt: null, status: { $ne: "inactive" } })
      .select("fullName empCode")
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).json({ success: true, data: employees });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await Employee.findOne({ _id: req.params.id, deletedAt: null })
      .populate(POPULATE_OPTS)
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const create = async (req, res) => {
  try {
    const body = { ...req.body };

    if (!body.empCode) body.empCode = await genEmpCode();

    const exists = await Employee.findOne({ empCode: body.empCode, deletedAt: null });
    if (exists) return res.status(400).json({ success: false, message: `Mã nhân viên ${body.empCode} đã tồn tại` });

    if (body.department && !body.departmentName) {
      const dept = await Department.findById(body.department).lean();
      if (dept) body.departmentName = dept.name;
    }
    if (body.position && !body.positionName) {
      const pos = await Position.findById(body.position).lean();
      if (pos) body.positionName = pos.name;
    }

    const doc = await Employee.create(body);
    const populated = await Employee.findById(doc._id).populate(POPULATE_OPTS).lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const update = async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.department && !body.departmentName) {
      const dept = await Department.findById(body.department).lean();
      if (dept) body.departmentName = dept.name;
    }
    if (body.position && !body.positionName) {
      const pos = await Position.findById(body.position).lean();
      if (pos) body.positionName = pos.name;
    }

    const doc = await Employee.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: body },
      { returnDocument: 'after', runValidators: true }
    ).populate(POPULATE_OPTS);
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const remove = async (req, res) => {
  try {
    const doc = await Employee.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "inactive" } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    return res.status(200).json({ success: true, message: "Đã xóa nhân viên" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const addWorkHistory = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

    emp.workHistory.push(req.body);

    if (req.body.toDepartment) {
      emp.department = req.body.toDepartment;
      const dept = await Department.findById(req.body.toDepartment).lean();
      if (dept) emp.departmentName = dept.name;
    }
    if (req.body.toPosition) {
      emp.position = req.body.toPosition;
      const pos = await Position.findById(req.body.toPosition).lean();
      if (pos) emp.positionName = pos.name;
    }
    if (req.body.toSalary) emp.salary = req.body.toSalary;

    await emp.save();
    return res.status(200).json({ success: true, data: emp });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getExpiringContracts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const employees = await Employee.find({
      deletedAt: null,
      status: { $in: ["active", "probation"] },
      contractType: { $ne: "indefinite" },
      endDateOfContract: { $gte: now, $lte: future },
    })
      .populate("position", "name")
      .populate("department", "name")
      .sort({ endDateOfContract: 1 })
      .lean();

    const result = employees.map((emp) => {
      const daysLeft = Math.ceil((new Date(emp.endDateOfContract) - now) / 86400000);
      return {
        ...emp,
        positionName: emp.positionName || emp.position?.name || "—",
        departmentName: emp.departmentName || emp.department?.name || "—",
        expiryFormatted: new Date(emp.endDateOfContract).toLocaleDateString("vi-VN"),
        daysLeft,
        urgency: daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "warning" : "normal",
      };
    });
    return res.status(200).json({ success: true, total: result.length, employees: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getEmployeesByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    const employees = await Employee.find({ _id: { $in: ids } })
      .populate("position", "name")
      .populate("department", "name")
      .sort({ fullName: 1 })
      .lean();
    return res.status(200).json({ success: true, employees });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getBirthdays = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();

    // Tính dayOfYear của hôm nay và ngày tương lai trong năm hiện tại
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const todayDoy = Math.ceil((now - startOfYear) / 86400000) + 1;
    const futureDoy = todayDoy + days;

    // Build điều kiện so sánh theo tháng + ngày (không theo năm)
    let matchExpr;
    if (futureDoy <= 365) {
      // Không vượt qua năm mới
      matchExpr = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfYear: "$birthday" }, todayDoy] },
            { $lte: [{ $dayOfYear: "$birthday" }, futureDoy] },
          ],
        },
      };
    } else {
      // Vượt qua năm mới (e.g. tháng 12 → tháng 1)
      const overflowDoy = futureDoy - 365;
      matchExpr = {
        $expr: {
          $or: [
            { $gte: [{ $dayOfYear: "$birthday" }, todayDoy] },
            { $lte: [{ $dayOfYear: "$birthday" }, overflowDoy] },
          ],
        },
      };
    }

    const employees = await Employee.find({
      deletedAt: null,
      status: { $in: ["active", "probation", "maternity-leave"] },
      birthday: { $exists: true, $ne: null },
      ...matchExpr,
    })
      .populate("position", "name")
      .populate("department", "name")
      .lean();

    const result = employees
      .map((emp) => {
        const bday = new Date(emp.birthday);
        // Tính ngày sinh nhật năm nay
        const birthdayThisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
        // Nếu đã qua năm nay (trong trường hợp overflow), tính năm sau
        if (birthdayThisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          birthdayThisYear.setFullYear(now.getFullYear() + 1);
        }
        const daysLeft = Math.round((birthdayThisYear - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
        const age = now.getFullYear() - bday.getFullYear() + (daysLeft === 0 ? 0 : 1);
        return {
          ...emp,
          positionName: emp.positionName || emp.position?.name || "—",
          departmentName: emp.departmentName || emp.department?.name || "—",
          birthdayFormatted: `${String(bday.getDate()).padStart(2, "0")}/${String(bday.getMonth() + 1).padStart(2, "0")}`,
          birthdayFull: bday.toLocaleDateString("vi-VN"),
          daysLeft,
          age,
          isToday: daysLeft === 0,
          urgency: daysLeft === 0 ? "today" : daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "warning" : "normal",
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return res.status(200).json({ success: true, total: result.length, employees: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const importExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Chưa upload file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push(row.values);
    });

    const allDepts = await Department.find({ deletedAt: null }).lean();
    const allPositions = await Position.find({ deletedAt: null }).lean();

    const normalize = (s) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (const values of rows) {
      try {
        const [empCode, fullName, genderRaw, birthday, phone, email,
          deptNameRaw, posNameRaw, startDate, contractTypeRaw,
          endDate, salary, nationalId, taxCode, socialInsuranceNo] = values;

        if (!empCode || !fullName) { results.skipped++; continue; }

        const deptMatch = allDepts.find(
          (d) => normalize(d.name) === normalize(deptNameRaw) ||
            (d.keywords || []).some((k) => normalize(deptNameRaw).includes(normalize(k)))
        );
        const posMatch = allPositions.find(
          (p) => normalize(p.name) === normalize(posNameRaw) ||
            (p.keywords || []).some((k) => normalize(posNameRaw).includes(normalize(k)))
        );

        const mapContractType = (t) => {
          if (!t) return "fixed-term";
          const n = normalize(t);
          if (n.includes("thu viec") || n.includes("probation")) return "probation";
          if (n.includes("khong xac dinh") || n.includes("vo thoi han")) return "indefinite";
          return "fixed-term";
        };

        const payload = {
          empCode: String(empCode).trim(),
          fullName: String(fullName).trim(),
          gender: normalize(genderRaw) === "nu" || normalize(genderRaw) === "female" ? "female" : "male",
          birthday: birthday ? new Date(birthday) : null,
          phone: phone ? String(phone).trim() : "",
          email: email ? String(email).trim() : "",
          department: deptMatch?._id || null,
          departmentName: deptMatch?.name || String(deptNameRaw || "").trim(),
          position: posMatch?._id || null,
          positionName: posMatch?.name || String(posNameRaw || "").trim(),
          startDate: startDate ? new Date(startDate) : null,
          contractType: mapContractType(contractTypeRaw),
          endDateOfContract: endDate ? new Date(endDate) : null,
          salary: parseFloat(salary) || 0,
          nationalId: nationalId ? String(nationalId).trim() : "",
          taxCode: taxCode ? String(taxCode).trim() : "",
          socialInsuranceNo: socialInsuranceNo ? String(socialInsuranceNo).trim() : "",
        };

        const existing = await Employee.findOne({ empCode: payload.empCode, deletedAt: null });
        if (existing) {
          await Employee.findByIdAndUpdate(existing._id, { $set: payload });
          results.updated++;
        } else {
          await Employee.create(payload);
          results.inserted++;
        }
      } catch (rowErr) {
        results.errors.push({ row: values?.[1] || "?", error: rowErr.message });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const exportExcel = async (req, res) => {
  try {
    const employees = await Employee.find({ deletedAt: null })
      .populate("department", "name")
      .populate("position", "name")
      .sort({ empCode: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Danh sách nhân viên");

    const HEADERS = [
      "Mã NV", "Họ và Tên", "Giới tính", "Ngày sinh", "SĐT", "Email công ty",
      "Phòng ban", "Chức danh", "Ngày vào làm", "Ngày chính thức",
      "Loại HĐ", "Ngày hết hạn HĐ", "Lương cơ bản",
      "CCCD/CMND", "Mã số thuế", "Số BHXH", "Trạng thái",
    ];

    sheet.addRow(HEADERS);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FF1677FF" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.columns = HEADERS.map((h) => ({ header: h, width: 20 }));

    const CONTRACT_LABELS = {
      probation: "Thử việc",
      "fixed-term": "Xác định thời hạn",
      indefinite: "Không xác định thời hạn",
    };
    const STATUS_LABELS = {
      active: "Đang làm việc",
      probation: "Thử việc",
      "maternity-leave": "Nghỉ thai sản",
      suspended: "Tạm hoãn",
      inactive: "Đã nghỉ việc",
      terminated: "Đã chấm dứt",
    };
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

    employees.forEach((emp) => {
      sheet.addRow([
        emp.empCode,
        emp.fullName,
        emp.gender === "female" ? "Nữ" : emp.gender === "male" ? "Nam" : "Khác",
        fmtDate(emp.birthday),
        emp.phone || "",
        emp.email || "",
        emp.departmentName || emp.department?.name || "",
        emp.positionName || emp.position?.name || "",
        fmtDate(emp.startDate),
        fmtDate(emp.officialDate),
        CONTRACT_LABELS[emp.contractType] || emp.contractType,
        fmtDate(emp.endDateOfContract),
        emp.salary || 0,
        emp.nationalId || "",
        emp.taxCode || "",
        emp.socialInsuranceNo || "",
        STATUS_LABELS[emp.status] || emp.status,
      ]);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="employees_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template NV");

    const HEADERS = [
      "Mã NV", "Họ và Tên (*)", "Giới tính (Nam/Nữ)", "Ngày sinh (dd/mm/yyyy)",
      "SĐT", "Email", "Phòng ban", "Chức danh",
      "Ngày vào làm (dd/mm/yyyy)", "Loại HĐ (Thử việc/Xác định thời hạn/Không xác định thời hạn)",
      "Ngày hết hạn HĐ (dd/mm/yyyy)", "Lương cơ bản",
      "CCCD/CMND", "Mã số thuế", "Số BHXH",
    ];

    sheet.addRow(HEADERS);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1677FF" } };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.columns = HEADERS.map((h) => ({ header: h, width: 25 }));

    sheet.addRow([
      "NV001", "Nguyễn Văn A", "Nam", "01/01/1990",
      "0901234567", "nvana@company.vn", "Phòng Kỹ thuật", "Kỹ sư phần mềm",
      "01/03/2024", "Xác định thời hạn", "01/03/2026", "15000000",
      "123456789012", "8765432100", "VN0123456789",
    ]);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template_nhanvien.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getOrgChart = async (req, res) => {
  try {
    const employees = await Employee.find({ deletedAt: null, status: "active" })
      .select("fullName empCode avatar position positionName department reportsTo")
      .populate("position", "name level reportsTo")
      .populate("department", "name")
      .lean();

    const nodes = employees.map(emp => {
      let managerId = null;
      if (emp.reportsTo) {
        managerId = emp.reportsTo.toString();
      } else if (emp.position && emp.position.reportsTo) {
        const managerPosId = emp.position.reportsTo.toString();
        const managerEmp = employees.find(e => e.position && e.position._id.toString() === managerPosId);
        if (managerEmp) {
          managerId = managerEmp._id.toString();
        }
      }
      return {
        id: emp._id.toString(),
        pid: managerId,
        name: emp.fullName,
        title: emp.positionName || "—",
        department: emp.department?.name || "—",
        empCode: emp.empCode,
        img: emp.avatar || "https://cdn.balkan.app/shared/empty-img-none.svg"
      };
    });

    return res.status(200).json({ success: true, data: nodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
