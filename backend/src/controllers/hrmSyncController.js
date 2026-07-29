import Employee from "../models/Employee.js";
import Position from "../models/Position.js";
import Department from "../models/Department.js";

// ─────────────────────────────────────────────────────────────
// HELPER: Phân tích ngày từ nhiều format khác nhau
// ─────────────────────────────────────────────────────────────
const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;

  // Timestamp (số giây hoặc ms)
  if (typeof val === "number") {
    const ts = val > 1e10 ? val : val * 1000; // nếu là giây → đổi sang ms
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
// HELPER: Chuẩn hoá string để map keyword
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
  // HRM API type values: "Definite_1", "Definite_2", "Indefinite", "Probation"
  if (t.includes("probation") || t.includes("thu viec") || t.includes("thuviec")) return "probation";
  if (t.includes("indefinite") || t.includes("khong xac dinh") || t.includes("vo thoi han")) return "indefinite";
  return "fixed-term"; // Definite_1, Definite_2, fixed-term
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

  // Thử /auth/login trước (phổ biến), fallback về /login
  const endpoints = [
    `${BASE_URL}/auth/login`,
    `${BASE_URL}/login`,
  ];

  // Thử cả 2 dạng body: { email } và { username }
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
// STEP 2: Kéo tất cả nhân viên (phân trang)
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

    // Log cấu trúc trang đầu tiên để debug
    if (page === 1) {
      console.log("[HRM] Employee response keys:", Object.keys(data));
    }

    // Response structure: { data: [...], total, page, limit, totalPages }
    const list = data.data || data.employees || data.items || data.results || (Array.isArray(data) ? data : []);

    allEmployees = allEmployees.concat(list);

    totalPages = data.totalPages || Math.ceil((data.total || list.length) / limit) || 1;
    console.log(`[HRM] Employees trang ${page}/${totalPages}: ${list.length} bản ghi`);
    page++;
  } while (page <= totalPages);

  console.log(`[HRM] ✔ Tổng employees kéo được: ${allEmployees.length}`);

  // ── Kéo chi tiết từng nhân viên để lấy birthday, phone, gender, contracts
  // Dùng concurrency limit 5 để không overload server
  console.log("[HRM] Đang kéo chi tiết từng nhân viên (birthday, phone, v.v.)...");
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
          if (!detailRes.ok) return emp; // fallback về list data
          const detail = await detailRes.json();
          // Merge: giữ list data, bổ sung personalInfo, contracts từ detail
          return {
            ...emp,
            personalInfo: detail.personalInfo || null,
            contracts: detail.contracts || [],
            // Nếu detail trả về birthday trực tiếp
            birthday: detail.birthday || detail.dateOfBirth || detail.personalInfo?.dob || emp.birthday,
          };
        } catch (_) {
          return emp; // nếu lỗi, dùng data list
        }
      })
    );
    enriched.push(...details);
  }

  console.log(`[HRM] ✔ Đã enriched ${enriched.length} nhân viên với thông tin chi tiết`);
  return enriched;

};

// ─────────────────────────────────────────────────────────────
// STEP 3: Kéo danh sách chức danh
// ─────────────────────────────────────────────────────────────
export const fetchAllPositions = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const url = `${BASE_URL}/positions?limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`[HRM] Lấy positions thất bại (${res.status})`);
  }

  const data = await res.json();

  if (data.data?.[0]) {
    console.log("[HRM] Sample position fields:", Object.keys(data.data[0]));
  }

  const list =
    data.data ||
    data.positions ||
    data.items ||
    data.results ||
    (Array.isArray(data) ? data : []);

  console.log(`[HRM] ✔ Tổng positions kéo được: ${list.length}`);
  return list;
};

// ─────────────────────────────────────────────────────────────
// STEP 4: Kéo tất cả hợp đồng (phân trang)
// ─────────────────────────────────────────────────────────────
export const fetchAllContracts = async (token) => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const limit = 12;
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

    // Log cấu trúc trang đầu tiên
    if (page === 1) {
      console.log("[HRM] Contract response keys:", Object.keys(data));
      if (data.data && data.data[0]) {
        console.log("[HRM] Sample contract fields:", Object.keys(data.data[0]));
      }
    }

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
    console.log(`[HRM] Contracts trang ${page}/${totalPages}: ${list.length} bản ghi`);
    page++;
  } while (page <= totalPages);

  console.log(`[HRM] ✔ Tổng contracts kéo được: ${allContracts.length}`);
  return allContracts;
};

// ─────────────────────────────────────────────────────────────
// STEP 5: Map + Upsert vào MongoDB
// ─────────────────────────────────────────────────────────────
export const runHRMSync = async () => {
  const BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!BASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error(
      "[HRM] Thiếu cấu hình EMPLOYEE_API_BASE_URL / ADMIN_USERNAME / ADMIN_PASSWORD trong .env"
    );
  }

  // ── 5.1 Login
  const token = await loginHRM();

  // ── 5.2 Kéo dữ liệu song song (positions + employees + contracts)
  const [hrmEmployees, hrmPositions, hrmContracts] = await Promise.all([
    fetchAllEmployees(token),
    fetchAllPositions(token).catch((err) => {
      console.warn("[HRM] Bỏ qua positions:", err.message);
      return [];
    }),
    fetchAllContracts(token).catch((err) => {
      console.warn("[HRM] Bỏ qua contracts:", err.message);
      return [];
    }),
  ]);

  // ── 5.3 Tạo map hợp đồng theo employeeId (UUID từ HRM)
  const contractByEmpId = {}; // key = emp.id (UUID)
  for (const c of hrmContracts) {
    // HRM contract field: employeeId (UUID)
    const empId = c.employeeId || c.employee_id || c.employee?.id;
    if (empId) {
      // Ưu tiên hợp đồng đang Active và là primary
      if (
        !contractByEmpId[empId] ||
        (c.status === "Active" && c.isPrimary)
      ) {
        contractByEmpId[empId] = c;
      }
    }
  }

  // ── 5.4 Lấy Position/Department hiện có trong DB để lookup
  let dbPositions = await Position.find({ deletedAt: null });
  let dbDepartments = await Department.find({ deletedAt: null });

  // Hàm tìm hoặc tạo Position
  const findOrCreatePosition = async (name) => {
    if (!name?.trim()) return null;
    const normName = name.trim();

    // Tìm chính xác hoặc keyword
    let found = dbPositions.find(
      (p) =>
        normalize(p.name) === normalize(normName) ||
        (p.keywords || []).some((kw) => normalize(normName).includes(normalize(kw)))
    );
    if (found) return found._id;

    // Tìm trong DB (regex)
    let pos = await Position.findOne({
      name: { $regex: new RegExp(`^${normName}$`, "i") },
      deletedAt: null,
    });
    if (!pos) {
      pos = await Position.create({ name: normName, keywords: [normName] });
    }
    dbPositions.push(pos);
    return pos._id;
  };

  // Hàm tìm hoặc tạo Department
  const findOrCreateDepartment = async (name) => {
    if (!name?.trim()) return null;
    const normName = name.trim();

    let found = dbDepartments.find(
      (d) =>
        normalize(d.name) === normalize(normName) ||
        (d.keywords || []).some((kw) => normalize(normName).includes(normalize(kw)))
    );
    if (found) return found._id;

    let dept = await Department.findOne({
      name: { $regex: new RegExp(`^${normName}$`, "i") },
      deletedAt: null,
    });
    if (!dept) {
      dept = await Department.create({ name: normName, keywords: [normName] });
    }
    dbDepartments.push(dept);
    return dept._id;
  };

  // ── 5.5 Sync từng nhân viên
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const emp of hrmEmployees) {
    try {
      // ---- Lấy empCode (thử nhiều field)
      const empCode = (
        emp.code ||
        emp.empCode ||
        emp.emp_code ||
        emp.employee_code ||
        emp.id ||
        emp._id ||
        ""
      )
        .toString()
        .trim();

      // ---- fullName
      const fullName = (
        emp.fullName ||
        emp.full_name ||
        emp.name ||
        `${emp.last_name || ""} ${emp.first_name || ""}`.trim()
      ).trim();

      if (!empCode || !fullName) {
        console.warn("[HRM] Bỏ qua nhân viên thiếu code/name:", emp);
        results.skipped++;
        continue;
      }

      // ---- Tìm hợp đồng tương ứng (dùng UUID của HRM)
      const empHrmId = emp.id;
      const contract = (empHrmId && contractByEmpId[empHrmId]) || null;

      // ---- Trích xuất các field từ employee (cấu trúc HRM API thực tế)
      // position.name = tên chức vụ (vd: "Chuyên viên Kinh doanh")
      // position.orgUnit.name = tên phòng/team (vd: "Team Kinh doanh")
      const positionName = (emp.position?.name || "").trim();
      const departmentName = (emp.position?.orgUnit?.name || "").trim();

      const email = emp.email || "";
      const phone = emp.phone || emp.mobile || emp.phoneNumber || "";
      const gender = mapGender(emp.gender || emp.sex);

      // HRM status: "Active", "Inactive", "Terminated"
      const statusRaw = (emp.status || "").toLowerCase();
      const status =
        statusRaw === "inactive" ||
        statusRaw === "terminated" ||
        emp.terminationDate != null
          ? "inactive"
          : "active";

      // Lương lấy từ contract nếu không có trên employee
      const salary = parseFloat(emp.salary || 0) || 0;

      // Ngày sinh — lấy từ personalInfo.dob (kết quả detail endpoint)
      const pi = emp.personalInfo; // từ GET /employees/:id
      const birthday = parseDate(
        pi?.dob || emp.birthday || emp.dateOfBirth || emp.date_of_birth
      );

      // Phone, gender từ personalInfo
      const phoneFromDetail = pi?.phone || emp.phone || emp.mobile || "";
      const genderFromDetail = mapGender(pi?.gender || emp.gender || emp.sex);

      // Ngày bắt đầu làm việc: hireDate
      const startDate = parseDate(emp.hireDate || emp.hire_date || emp.startDate);

      // ---- Trích xuất từ contract (ưu tiên emp.contracts[] từ detail, fallback sang contractByEmpId)
      // emp.contracts[] từ GET /employees/:id detail (Active + isPrimary ưu tiên)
      const empContracts = emp.contracts || [];
      const activeContract =
        empContracts.find((c) => c.status === "Active" && c.isPrimary) ||
        empContracts.find((c) => c.status === "Active") ||
        empContracts[0] ||
        contract; // fallback sang contractByEmpId

      let endDateOfContract = null;
      let contractType = "fixed-term";
      let contractNo = "";
      let contractStartDate = null;
      let contractSalary = 0;

      if (activeContract) {
        // HRM fields: endDate, startDate, contractNumber, type, salary
        endDateOfContract = parseDate(activeContract.endDate || activeContract.end_date);
        contractStartDate = parseDate(activeContract.startDate || activeContract.start_date);
        contractNo = activeContract.contractNumber || activeContract.contract_no || activeContract.code || "";
        contractType = mapContractType(activeContract.type || activeContract.contractType || "");
        contractSalary = parseFloat(activeContract.salary || 0) || 0;
      }

      // ---- Lookup Position / Department trong DB
      const positionId = await findOrCreatePosition(positionName);
      const departmentId = await findOrCreateDepartment(departmentName);

      // ---- Xây payload
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
        position: positionId || null,
        department: departmentId || null,
        contractType,
        contractNo: contractNo || undefined,
        ...(birthday && { birthday }),
        ...(startDate && { startDate }),
        ...(contractStartDate && { contractStartDate }),
        ...(endDateOfContract
          ? { endDateOfContract }
          : { endDateOfContract: null }),
        note: `Đồng bộ từ HRM API – ${new Date().toLocaleDateString("vi-VN")}`,
      };

      // ---- Upsert
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
        results.updated++;
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
        results.inserted++;
      }
    } catch (err) {
      const code =
        emp.code || emp.empCode || emp.emp_code || emp.id || "unknown";
      console.error(`[HRM] ❌ Lỗi xử lý nhân viên ${code}:`, err.message);
      results.errors.push({ empCode: code, error: err.message });
    }
  }

  console.log(
    `[HRM] ✅ Sync hoàn tất: ${results.inserted} thêm mới, ${results.updated} cập nhật, ${results.skipped} bỏ qua, ${results.errors.length} lỗi`
  );
  return results;
};

// ─────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/v1/fumee/scrape/syncHRM  (trigger thủ công)
// ─────────────────────────────────────────────────────────────
export const syncFromHRM = async (req, res) => {
  try {
    console.log("[HRM] Trigger sync thủ công...");
    const results = await runHRMSync();
    return res.status(200).json({
      success: true,
      message: `Đồng bộ HRM hoàn tất: ${results.inserted} thêm mới, ${results.updated} cập nhật, ${results.skipped} bỏ qua`,
      results,
    });
  } catch (error) {
    console.error("[HRM] Sync thất bại:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
