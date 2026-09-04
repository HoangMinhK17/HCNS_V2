import Employee from "../models/Employee.js";
import Position from "../models/Position.js";
import Department from "../models/Department.js";
import HrmSyncLog from "../models/HrmSyncLog.js";

// ─────────────────────────────────────────────────────────────
// HELPER: Phân tích ngày từ nhiều format khác nhau
// ─────────────────────────────────────────────────────────────
const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;

  // Timestamp (số giây hoặc ms)
  if (typeof val === "number") {
    const ts = val > 1e10 ? val : val * 1000;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val !== "string") return null;
  const s = val.trim();
  if (!s || s === "—" || s === "-" || s === "N/A" || s === "null") return null;

  // dd/mm/yyyy hoặc dd-mm-yyyy
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }

  // yyyy-mm-dd hoặc ISO
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// ─────────────────────────────────────────────────────────────
// HELPER: Chuẩn hoá string để map keyword / name
// ─────────────────────────────────────────────────────────────
const normalize = (str) =>
  (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// ─────────────────────────────────────────────────────────────
// HELPER: Map loại hợp đồng
// ─────────────────────────────────────────────────────────────
const mapContractType = (text) => {
  if (!text) return "fixed-term";
  const t = normalize(text);
  if (t.includes("probation") || t.includes("thu viec") || t.includes("thuviec")) return "probation";
  if (t.includes("indefinite") || t.includes("khong xac dinh") || t.includes("vo thoi han")) return "indefinite";
  return "fixed-term";
};

// ─────────────────────────────────────────────────────────────
// HELPER: Map giới tính
// ─────────────────────────────────────────────────────────────
const mapGender = (val) => {
  if (!val) return "male";
  const v = String(val).toLowerCase();
  if (v === "female" || v === "nữ" || v === "2" || v === "f") return "female";
  return "male";
};

// ─────────────────────────────────────────────────────────────
// STEP 1: Login HRM → lấy accessToken
// ─────────────────────────────────────────────────────────────
export const loginHRM = async () => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  const endpoints = [
    `${BASE_URL}/auth/login`,
    `${BASE_URL}/login`,
  ];

  const bodies = [
    { email: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  ];

  for (const url of endpoints) {
    for (const body of bodies) {
      try {
        console.log(`[HRM] Thử login: ${url} với body:`, JSON.stringify(body));
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(`[HRM] ${url} trả về ${res.status}: ${text.slice(0, 200)}`);
          continue;
        }

        const data = await res.json();
        const token =
          data.accessToken ||
          data.access_token ||
          data.token ||
          data.data?.accessToken ||
          data.data?.access_token ||
          data.data?.token;

        if (!token) {
          console.warn("[HRM] Response không có token:", JSON.stringify(data).slice(0, 300));
          continue;
        }

        console.log(`[HRM] ✔ Login thành công qua ${url}`);
        return token;
      } catch (err) {
        console.warn(`[HRM] Lỗi kết nối ${url}:`, err.message);
      }
    }
  }

  throw new Error("[HRM] Không thể login vào HRM — kiểm tra EMPLOYEE_API_BASE_URL / ADMIN_USERNAME / ADMIN_PASSWORD");
};

// ─────────────────────────────────────────────────────────────
// STEP 2: Kéo danh sách Đơn vị / Phòng ban (/org-units)
// ─────────────────────────────────────────────────────────────
export const fetchAllOrgUnits = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const url = `${BASE_URL}/org-units`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn(`[HRM] Kéo org-units thất bại (${res.status})`);
    return [];
  }

  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : data.data || data.items || data.results || [];
  console.log(`[HRM] ✔ Tổng org-units (phòng ban) kéo được: ${list.length}`);
  return list;
};

// ─────────────────────────────────────────────────────────────
// STEP 3: Kéo danh sách Chức danh (/positions)
// ─────────────────────────────────────────────────────────────
export const fetchAllPositions = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const url = `${BASE_URL}/positions?limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn(`[HRM] Kéo positions thất bại (${res.status})`);
    return [];
  }

  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : data.data || data.positions || data.items || data.results || [];
  console.log(`[HRM] ✔ Tổng positions kéo được: ${list.length}`);
  return list;
};

// ─────────────────────────────────────────────────────────────
// STEP 4: Kéo danh sách Hợp đồng (/contracts)
// ─────────────────────────────────────────────────────────────
export const fetchAllContracts = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const limit = 15;
  let page = 1;
  let allContracts = [];
  let totalPages = 1;

  do {
    const url = `${BASE_URL}/contracts?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn(`[HRM] Lấy contracts trang ${page} thất bại (${res.status}) — bỏ qua`);
      break;
    }

    const data = await res.json();
    const list =
      data.data ||
      data.contracts ||
      data.items ||
      data.results ||
      (Array.isArray(data) ? data : []);

    allContracts = allContracts.concat(list);

    const total =
      data.total ||
      data.totalItems ||
      data.meta?.total ||
      data.pagination?.total ||
      list.length;

    totalPages = Math.ceil(total / limit) || 1;
    page++;
  } while (page <= totalPages);

  console.log(`[HRM] ✔ Tổng contracts kéo được: ${allContracts.length}`);
  return allContracts;
};

// ─────────────────────────────────────────────────────────────
// STEP 5: Kéo danh sách Nhân viên (/employees) kèm Chi tiết
// ─────────────────────────────────────────────────────────────
export const fetchAllEmployees = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const limit = 15;
  let page = 1;
  let allEmployees = [];
  let totalPages = 1;

  do {
    const url = `${BASE_URL}/employees?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`[HRM] Lấy employees trang ${page} thất bại (${res.status})`);
    }

    const data = await res.json();
    const list = data.data || data.employees || data.items || data.results || (Array.isArray(data) ? data : []);
    allEmployees = allEmployees.concat(list);

    totalPages = data.totalPages || Math.ceil((data.total || list.length) / limit) || 1;
    page++;
  } while (page <= totalPages);

  console.log(`[HRM] ✔ Tổng employees kéo được: ${allEmployees.length}`);

  // Enriched chi tiết từng nhân viên
  console.log("[HRM] Đang kéo chi tiết từng nhân viên (birthday, phone, contracts, v.v.)...");
  const CONCURRENCY = 5;
  const enriched = [];
  for (let i = 0; i < allEmployees.length; i += CONCURRENCY) {
    const chunk = allEmployees.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      chunk.map(async (emp) => {
        try {
          const detailRes = await fetch(`${BASE_URL}/employees/${emp.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!detailRes.ok) return emp;
          const detail = await detailRes.json();
          return {
            ...emp,
            personalInfo: detail.personalInfo || null,
            contracts: detail.contracts || [],
            birthday: detail.birthday || detail.dateOfBirth || detail.personalInfo?.dob || emp.birthday,
          };
        } catch (_) {
          return emp;
        }
      })
    );
    enriched.push(...details);
  }

  console.log(`[HRM] ✔ Đã enriched ${enriched.length} nhân viên với thông tin chi tiết`);
  return enriched;
};

// ─────────────────────────────────────────────────────────────
// STEP 6: MAIN RUN SYNC - Đồng bộ chuẩn hóa Phòng ban, Chức danh, Nhân viên
// ─────────────────────────────────────────────────────────────
export const runHRMSync = async (triggeredBy = "manual") => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!BASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error(
      "[HRM] Thiếu cấu hình EMPLOYEE_API_BASE_URL / ADMIN_USERNAME / ADMIN_PASSWORD trong .env"
    );
  }

  // ── 6.1 Login HRM
  const token = await loginHRM();

  // ── 6.2 Kéo dữ liệu song song
  const [hrmOrgUnits, hrmPositions, hrmContracts, hrmEmployees] = await Promise.all([
    fetchAllOrgUnits(token),
    fetchAllPositions(token),
    fetchAllContracts(token).catch((err) => {
      console.warn("[HRM] Bỏ qua contracts:", err.message);
      return [];
    }),
    fetchAllEmployees(token),
  ]);

  // ── 6.3 ĐỒNG BỘ PHÒNG BAN (DEPARTMENTS)
  console.log("[HRM] Bắt đầu đồng bộ Phòng ban (Departments)...");
  const deptResults = { total: hrmOrgUnits.length, inserted: 0, updated: 0, removed: 0 };
  const validDeptIds = [];
  const deptByHrmId = {};
  const deptByName = {};

  for (const org of hrmOrgUnits) {
    const orgName = (org.name || "").trim();
    const orgCode = (org.code || "").trim();
    if (!orgName) continue;

    // Tìm phòng ban hiện có theo code hoặc name
    let existingDept = null;
    if (orgCode) {
      existingDept = await Department.findOne({ code: orgCode });
    }
    if (!existingDept) {
      existingDept = await Department.findOne({
        name: { $regex: new RegExp(`^${orgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
    }

    const deptPayload = {
      name: orgName,
      code: orgCode || undefined,
      status: org.isActive === false ? "inactive" : "active",
      deletedAt: null,
    };

    if (existingDept) {
      await Department.updateOne({ _id: existingDept._id }, { $set: deptPayload });
      validDeptIds.push(existingDept._id);
      deptByHrmId[org.id] = existingDept._id;
      deptByName[normalize(orgName)] = existingDept._id;
      deptResults.updated++;
    } else {
      const newDept = await Department.create(deptPayload);
      validDeptIds.push(newDept._id);
      deptByHrmId[org.id] = newDept._id;
      deptByName[normalize(orgName)] = newDept._id;
      deptResults.inserted++;
    }
  }

  // Xóa bỏ tất cả phòng ban cũ không có trong danh sách HRM
  const removedDepts = await Department.find({ _id: { $nin: validDeptIds } }, { _id: 1, name: 1 });
  if (removedDepts.length > 0) {
    await Department.deleteMany({ _id: { $nin: validDeptIds } });
    deptResults.removed = removedDepts.length;
    console.log(`[HRM] 🗑 Đã xóa ${removedDepts.length} phòng ban cũ không có trên HRM.`);
  }

  // ── 6.4 ĐỒNG BỘ CHỨC DANH (POSITIONS)
  console.log("[HRM] Bắt đầu đồng bộ Chức danh (Positions)...");
  const posResults = { total: hrmPositions.length, inserted: 0, updated: 0, removed: 0 };
  const validPosIds = [];
  const posByHrmId = {};
  const posByName = {};

  for (const pos of hrmPositions) {
    const posName = (pos.name || "").trim();
    const posCode = (pos.code || "").trim();
    if (!posName) continue;

    // Tìm phòng ban tương ứng của chức danh
    const orgUnitId = pos.orgUnitId || pos.orgUnit?.id;
    const orgUnitName = pos.orgUnit?.name;
    const mappedDeptId =
      (orgUnitId && deptByHrmId[orgUnitId]) ||
      (orgUnitName && deptByName[normalize(orgUnitName)]) ||
      null;

    let existingPos = null;
    if (posCode) {
      existingPos = await Position.findOne({ code: posCode });
    }
    if (!existingPos) {
      existingPos = await Position.findOne({
        name: { $regex: new RegExp(`^${posName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
    }

    const posPayload = {
      name: posName,
      code: posCode || undefined,
      department: mappedDeptId,
      status: pos.isActive === false ? "inactive" : "active",
      deletedAt: null,
    };

    if (existingPos) {
      await Position.updateOne({ _id: existingPos._id }, { $set: posPayload });
      validPosIds.push(existingPos._id);
      posByHrmId[pos.id] = existingPos._id;
      posByName[normalize(posName)] = existingPos._id;
      posResults.updated++;
    } else {
      const newPos = await Position.create(posPayload);
      validPosIds.push(newPos._id);
      posByHrmId[pos.id] = newPos._id;
      posByName[normalize(posName)] = newPos._id;
      posResults.inserted++;
    }
  }

  // Xóa bỏ tất cả chức danh cũ không có trong danh sách HRM
  const removedPositions = await Position.find({ _id: { $nin: validPosIds } }, { _id: 1, name: 1 });
  if (removedPositions.length > 0) {
    await Position.deleteMany({ _id: { $nin: validPosIds } });
    posResults.removed = removedPositions.length;
    console.log(`[HRM] 🗑 Đã xóa ${removedPositions.length} chức danh cũ không có trên HRM.`);
  }

  // ── 6.5 TẠO MAP HỢP ĐỒNG THEO EMPLOYEE ID
  const contractByEmpId = {};
  for (const c of hrmContracts) {
    const empId = c.employeeId || c.employee_id || c.employee?.id;
    if (empId) {
      if (!contractByEmpId[empId] || (c.status === "Active" && c.isPrimary)) {
        contractByEmpId[empId] = c;
      }
    }
  }

  // ── 6.6 ĐỒNG BỘ NHÂN VIÊN (EMPLOYEES)
  console.log("[HRM] Bắt đầu đồng bộ Nhân viên (Employees)...");
  const empResults = { total: hrmEmployees.length, inserted: 0, updated: 0, removed: 0, errors: [] };
  const validEmpCodes = [];

  for (const emp of hrmEmployees) {
    try {
      const empCode = (
        emp.code ||
        emp.empCode ||
        emp.emp_code ||
        emp.employee_code ||
        emp.id ||
        emp._id ||
        ""
      ).toString().trim();

      const fullName = (
        emp.fullName ||
        emp.full_name ||
        emp.name ||
        `${emp.last_name || ""} ${emp.first_name || ""}`.trim()
      ).trim();

      if (!empCode || !fullName) {
        console.warn("[HRM] Bỏ qua nhân viên thiếu code/name:", emp);
        continue;
      }

      validEmpCodes.push(empCode);

      // Map hợp đồng
      const empHrmId = emp.id;
      const contract = (empHrmId && contractByEmpId[empHrmId]) || null;

      // Map chức vụ & phòng ban
      const positionName = (emp.position?.name || "").trim();
      const departmentName = (emp.position?.orgUnit?.name || "").trim();

      const mappedPosId =
        (emp.position?.id && posByHrmId[emp.position.id]) ||
        (positionName && posByName[normalize(positionName)]) ||
        null;

      const mappedDeptId =
        (emp.position?.orgUnitId && deptByHrmId[emp.position.orgUnitId]) ||
        (emp.position?.orgUnit?.id && deptByHrmId[emp.position.orgUnit.id]) ||
        (departmentName && deptByName[normalize(departmentName)]) ||
        null;

      const email = emp.email || "";
      const phone = emp.phone || emp.mobile || emp.phoneNumber || "";
      const gender = mapGender(emp.gender || emp.sex);

      const statusRaw = (emp.status || "").toLowerCase();
      let status = "active";
      if (
        statusRaw === "inactive" ||
        statusRaw === "terminated" ||
        emp.terminationDate != null
      ) {
        status = "inactive";
      } else if (
        statusRaw === "probation" ||
        statusRaw.includes("thử việc") ||
        statusRaw.includes("thu viec")
      ) {
        status = "probation";
      } else if (statusRaw === "pre-onboarding" || statusRaw.includes("pre-onboarding")) {
        status = "Pre-Onboarding";
      }

      const salary = parseFloat(emp.salary || 0) || 0;
      const pi = emp.personalInfo;
      const birthday = parseDate(
        pi?.dob || emp.birthday || emp.dateOfBirth || emp.date_of_birth
      );
      const phoneFromDetail = pi?.phone || phone;
      const genderFromDetail = mapGender(pi?.gender || gender);
      const startDate = parseDate(emp.hireDate || emp.hire_date || emp.startDate);

      const empContracts = emp.contracts || [];
      const activeContract =
        empContracts.find((c) => c.status === "Active" && c.isPrimary) ||
        empContracts.find((c) => c.status === "Active") ||
        empContracts[0] ||
        contract;

      let endDateOfContract = null;
      let contractType = "fixed-term";
      let contractNo = "";
      let contractStartDate = null;
      let contractSalary = 0;

      if (activeContract) {
        endDateOfContract = parseDate(activeContract.endDate || activeContract.end_date);
        contractStartDate = parseDate(activeContract.startDate || activeContract.start_date);
        contractNo = activeContract.contractNumber || activeContract.contract_no || activeContract.code || "";
        contractType = mapContractType(activeContract.type || activeContract.contractType || "");
        contractSalary = parseFloat(activeContract.salary || 0) || 0;
      }

      const finalSalary = contractSalary || salary;
      const payload = {
        fullName,
        gender: genderFromDetail,
        email,
        phone: phoneFromDetail || "Chưa cập nhật",
        salary: finalSalary,
        status,
        positionName,
        departmentName,
        position: mappedPosId,
        department: mappedDeptId,
        contractType,
        contractNo: contractNo || undefined,
        deletedAt: null,
        ...(birthday && { birthday }),
        ...(startDate && { startDate }),
        ...(contractStartDate && { contractStartDate }),
        ...(endDateOfContract ? { endDateOfContract } : { endDateOfContract: null }),
        note: `Đồng bộ từ HRM API – ${new Date().toLocaleDateString("vi-VN")}`,
      };

      const existing = await Employee.findOne({ empCode });
      if (existing) {
        const $set = {};
        const $unset = {};
        for (const [k, v] of Object.entries(payload)) {
          if (v === undefined) continue;
          if (v === null) $unset[k] = 1;
          else $set[k] = v;
        }
        const updateDoc = {};
        if (Object.keys($set).length > 0) updateDoc.$set = $set;
        if (Object.keys($unset).length > 0) updateDoc.$unset = $unset;
        await Employee.updateOne({ empCode }, updateDoc);
        empResults.updated++;
      } else {
        const createPayload = {
          empCode,
          ...payload,
          startDate: payload.startDate || new Date(),
          birthday: payload.birthday || null,
        };
        if (createPayload.endDateOfContract === null) {
          delete createPayload.endDateOfContract;
        }
        await Employee.create(createPayload);
        empResults.inserted++;
      }
    } catch (err) {
      const code = emp.code || emp.empCode || emp.emp_code || emp.id || "unknown";
      console.error(`[HRM] ❌ Lỗi xử lý nhân viên ${code}:`, err.message);
      empResults.errors.push({ empCode: code, error: err.message });
    }
  }

  // Xóa bỏ tất cả nhân viên cũ không có trong danh sách HRM
  const removedEmployees = await Employee.find({ empCode: { $nin: validEmpCodes } }, { empCode: 1, fullName: 1 });
  if (removedEmployees.length > 0) {
    await Employee.deleteMany({ empCode: { $nin: validEmpCodes } });
    empResults.removed = removedEmployees.length;
    console.log(`[HRM] 🗑 Đã xóa ${removedEmployees.length} nhân viên cũ không có trên HRM.`);
  }

  // ── 6.7 LƯU VẾT VÀO HrmSyncLog
  const logDoc = await HrmSyncLog.create({
    syncedAt: new Date(),
    status: "success",
    triggeredBy,
    departments: {
      total: hrmOrgUnits.length,
      inserted: deptResults.inserted,
      updated: deptResults.updated,
      removed: deptResults.removed,
      names: hrmOrgUnits.map((o) => o.name || ""),
    },
    positions: {
      total: hrmPositions.length,
      inserted: posResults.inserted,
      updated: posResults.updated,
      removed: posResults.removed,
      names: hrmPositions.map((p) => p.name || ""),
    },
    employees: {
      total: validEmpCodes.length,
      inserted: empResults.inserted,
      updated: empResults.updated,
      removed: empResults.removed,
      codes: validEmpCodes,
    },
  });

  const finalResults = {
    syncedAt: logDoc.syncedAt,
    departments: deptResults,
    positions: posResults,
    employees: empResults,
  };

  console.log(
    `[HRM] ✅ Sync hoàn tất: NV (${empResults.total} người, +${empResults.inserted}, ~${empResults.updated}, -${empResults.removed}) | PB (${deptResults.total} phòng, +${deptResults.inserted}, ~${deptResults.updated}, -${deptResults.removed}) | CD (${posResults.total} chức danh, +${posResults.inserted}, ~${posResults.updated}, -${posResults.removed})`
  );

  return finalResults;
};

// ─────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/v1/fumee/scrape/syncHRM (trigger thủ công)
// ─────────────────────────────────────────────────────────────
export const syncFromHRM = async (req, res) => {
  try {
    console.log("[HRM] Trigger sync thủ công...");
    const results = await runHRMSync("manual");
    return res.status(200).json({
      success: true,
      message: `Đồng bộ HRM thành công: ${results.employees.total} nhân viên (đã xóa ${results.employees.removed} cũ), ${results.departments.total} phòng ban, ${results.positions.total} chức danh.`,
      results,
    });
  } catch (error) {
    console.error("[HRM] Sync thất bại:", error.message);
    try {
      await HrmSyncLog.create({
        syncedAt: new Date(),
        status: "failed",
        triggeredBy: "manual",
        error: error.message,
      });
    } catch (_) {}
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ENDPOINT: GET /api/v1/fumee/scrape/latest-sync (lấy thông tin đồng bộ gần nhất)
// ─────────────────────────────────────────────────────────────
export const getLatestSyncLog = async (req, res) => {
  try {
    const latest = await HrmSyncLog.findOne().sort({ syncedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: latest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
