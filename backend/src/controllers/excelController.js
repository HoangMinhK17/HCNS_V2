import ExcelJS from "exceljs";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import Position from "../models/Position.js";

// ─────────────────────────────────────────────────────────────
// 1. Tải Template Excel
// ─────────────────────────────────────────────────────────────
export const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Nhân sự");

    // Khai báo các cột
    sheet.columns = [
      { header: "Mã NV*", key: "empCode", width: 15 },
      { header: "Họ và tên*", key: "fullName", width: 25 },
      { header: "Email*", key: "email", width: 25 },
      { header: "SĐT", key: "phone", width: 15 },
      { header: "Ngày sinh (DD/MM/YYYY)", key: "birthday", width: 20 },
      { header: "Giới tính (Nam/Nữ/Khác)", key: "gender", width: 15 },
      { header: "Phòng ban", key: "department", width: 20 },
      { header: "Chức danh", key: "position", width: 20 },
      { header: "Lương cơ bản", key: "salary", width: 15 },
      { header: "Ngày vào làm (DD/MM/YYYY)*", key: "startDate", width: 25 },
      { header: "Loại HĐ (probation/fixed-term/indefinite)", key: "contractType", width: 35 },
      { header: "Ngày hết hạn HĐ (DD/MM/YYYY)", key: "endDateOfContract", width: 30 }
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    // Thêm dữ liệu mẫu
    sheet.addRow({
      empCode: "NV001",
      fullName: "Nguyễn Văn A",
      email: "nva@fumeetech.com",
      phone: "0901234567",
      birthday: "01/01/1990",
      gender: "Nam",
      department: "Phòng Kỹ thuật",
      position: "Lập trình viên",
      salary: 15000000,
      startDate: "15/07/2023",
      contractType: "fixed-term",
      endDateOfContract: "14/07/2024"
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Template_Import_NhanSu.xlsx"');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Helper parse date: "15/07/2023" -> Date object
// ─────────────────────────────────────────────────────────────
const parseDate = (str) => {
  if (!str) return null;
  // Xử lý nếu là đối tượng Date từ Excel
  if (str instanceof Date) return str;
  const s = String(str).trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// ─────────────────────────────────────────────────────────────
// 2. Import Excel
// ─────────────────────────────────────────────────────────────
export const importPersonnel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng đính kèm file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const records = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const values = row.values;
      // ExcelJS row.values is 1-indexed array
      const empCode = values[1]?.toString().trim();
      const fullName = values[2]?.toString().trim();
      const email = values[3]?.toString().trim();

      if (!empCode || !fullName) return; // Bỏ qua dòng trống

      records.push({
        empCode,
        fullName,
        email: email || "",
        phone: values[4]?.toString().trim() || "",
        birthdayRaw: values[5],
        genderRaw: values[6]?.toString().trim() || "Nam",
        departmentName: values[7]?.toString().trim() || "",
        positionName: values[8]?.toString().trim() || "",
        salary: parseFloat(values[9]) || 0,
        startDateRaw: values[10],
        contractTypeRaw: values[11]?.toString().trim() || "fixed-term",
        endDateRaw: values[12]
      });
    });

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: "File không có dữ liệu hợp lệ" });
    }

    // Lấy cache departments và positions
    const allDepts = await Department.find();
    const allPositions = await Position.find();
    const deptMap = new Map();
    const posMap = new Map();

    const getOrCreateDept = async (name) => {
      if (!name) return null;
      const key = name.toLowerCase();
      if (deptMap.has(key)) return deptMap.get(key);
      let dept = allDepts.find(d => d.name.toLowerCase() === key);
      if (!dept) {
        dept = await Department.create({ name });
        allDepts.push(dept);
      }
      deptMap.set(key, dept._id);
      return dept._id;
    };

    const getOrCreatePos = async (name, deptId) => {
      if (!name) return null;
      const key = name.toLowerCase();
      if (posMap.has(key)) return posMap.get(key);
      let pos = allPositions.find(p => p.name.toLowerCase() === key);
      if (!pos) {
        pos = await Position.create({ name, department: deptId });
        allPositions.push(pos);
      }
      posMap.set(key, pos._id);
      return pos._id;
    };

    const bulkOps = [];
    for (const rec of records) {
      const deptId = await getOrCreateDept(rec.departmentName);
      const posId = await getOrCreatePos(rec.positionName, deptId);

      let gender = "male";
      if (rec.genderRaw.toLowerCase() === "nữ" || rec.genderRaw.toLowerCase() === "female") gender = "female";
      else if (rec.genderRaw.toLowerCase() === "khác" || rec.genderRaw.toLowerCase() === "other") gender = "other";

      const payload = {
        fullName: rec.fullName,
        email: rec.email,
        phone: rec.phone,
        birthday: parseDate(rec.birthdayRaw),
        gender,
        department: deptId,
        position: posId,
        salary: rec.salary,
        startDate: parseDate(rec.startDateRaw) || new Date(),
        contractType: ["probation", "fixed-term", "indefinite"].includes(rec.contractTypeRaw) ? rec.contractTypeRaw : "fixed-term",
        endDateOfContract: parseDate(rec.endDateRaw)
      };

      // Xóa các key undefined để update không lỗi
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      bulkOps.push({
        updateOne: {
          filter: { empCode: rec.empCode },
          update: { $set: payload },
          upsert: true
        }
      });
    }

    const result = await Employee.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: `Đã xử lý ${records.length} nhân viên. Mới: ${result.upsertedCount}, Cập nhật: ${result.modifiedCount}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. Export Excel
// ─────────────────────────────────────────────────────────────
export const exportPersonnel = async (req, res) => {
  try {
    const employees = await Employee.find().populate("department", "name").populate("position", "name").lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Danh_sach_nhan_su");

    sheet.columns = [
      { header: "Mã NV", key: "empCode", width: 15 },
      { header: "Họ và tên", key: "fullName", width: 25 },
      { header: "Email", key: "email", width: 25 },
      { header: "SĐT", key: "phone", width: 15 },
      { header: "Phòng ban", key: "departmentName", width: 20 },
      { header: "Chức danh", key: "positionName", width: 20 },
      { header: "Lương cơ bản", key: "salary", width: 15 },
      { header: "Loại HĐ", key: "contractType", width: 20 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };

    employees.forEach(emp => {
      sheet.addRow({
        empCode: emp.empCode,
        fullName: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        departmentName: emp.department?.name || "",
        positionName: emp.position?.name || "",
        salary: emp.salary,
        contractType: emp.contractType
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Export_NhanSu.xlsx"');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
