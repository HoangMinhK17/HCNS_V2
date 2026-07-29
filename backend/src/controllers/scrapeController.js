import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import os from "os";
import Employee from "../models/Employee.js";
import Position from "../models/Position.js";
import Department from "../models/Department.js";

const parseDate = (str) => {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  if (!s || s === "—" || s === "-" || s === "N/A") return null;

  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(s);

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};


const normalize = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const findMappingDynamic = (positionName, records) => {
  const norm = normalize(positionName);
  for (const record of records) {
    if (record.keywords && record.keywords.length > 0) {
      for (const kw of record.keywords) {
        if (norm.includes(normalize(kw))) return record;
      }
    }
  }
  return null;
};

/**
 * Map loại hợp đồng từ text tự do → enum schema
 */
const mapContractType = (text) => {
  if (!text) return "fixed-term";
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("thu viec") || t.includes("probation")) return "probation";
  if (t.includes("khong xac dinh") || t.includes("vo thoi han") || t.includes("indefinite")) return "indefinite";
  return "fixed-term";
};

// ─────────────────────────────────────────────
// POST /api/scrape/scrapeBase
// Body: { url: "https://xspace.base.vn/embed?..." }
// ─────────────────────────────────────────────
export const scrapeBaseVn = async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("base.vn")) {
    return res.status(400).json({ success: false, message: "URL không hợp lệ. Phải là trang từ base.vn" });
  }

  // Thư mục tạm duy nhất mỗi lần chạy — không bao giờ bị lock
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "puppeteer-hcns-"));
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: tmpDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1440,900",
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // ── BƯỚC 1: Mở trang embed để user đăng nhập ──
    console.log(`[Scraper] Bước 1 – Mở: ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    } catch (e) {
      console.warn("[Scraper] goto warning (bỏ qua):", e.message);
    }

    // Chờ user đăng nhập và trang HRM load trong iframe (tối đa 90s)
    console.log("[Scraper] Đang chờ bạn đăng nhập Base.vn (tối đa 90s)...");
    let hrmReady = false;
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 2000));

      // Kiểm tra iframe hrm.base.vn đã xuất hiện và có nội dung
      const frames = page.frames();
      const hrmFrame = frames.find(f => f.url().includes("hrm.base.vn"));
      if (hrmFrame) {
        const bodyLen = await hrmFrame.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0);
        if (bodyLen > 500) {
          hrmReady = true;
          console.log(`[Scraper] ✔ HRM iframe đã load sau ${(i + 1) * 2}s (bodyLen=${bodyLen})`);
          break;
        }
      }

      // Nếu trang chính tự redirect về hrm.base.vn
      if (page.url().includes("hrm.base.vn")) {
        hrmReady = true;
        console.log(`[Scraper] ✔ Trang chính redirect sang hrm.base.vn sau ${(i + 1) * 2}s`);
        break;
      }
    }

    if (!hrmReady) {
      await browser.close();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { }
      return res.status(200).json({
        success: false,
        message: "Hết thời gian chờ (90s). Vui lòng thử lại và đăng nhập vào cửa sổ Chrome nhanh hơn.",
        employees: [],
      });
    }

    // ── BƯỚC 2: Điều hướng THẲNG đến hrm.base.vn/employees ──
    console.log("[Scraper] Bước 2 – Chuyển sang hrm.base.vn/employees...");
    try {
      await page.goto("https://hrm.base.vn/employees", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (e) {
      console.warn("[Scraper] goto hrm warning:", e.message);
    }

    // Tự động đóng popup "Desktop notification" nếu có (không chờ lâu)
    await page.keyboard.press("Escape").catch(() => { });

    console.log("[Scraper] Đang trích xuất dữ liệu trực tiếp từ API Client của Base...");
    let employees = [];

    // Chờ Base.vn khởi tạo biến window.Client chứa toàn bộ dữ liệu JSON
    const baseData = await page.waitForFunction(() => {
      if (window.Client && window.Client.employees && window.Client.employees.length > 0) {
        return {
          employees: window.Client.employees,
          networks: window.Client.networks || [],
          clientKeys: Object.keys(window.Client),
          sampleEmp: window.Client.employees[0],
          departments: window.Client.departments || [],
          groups: window.Client.groups || [],
          areas: window.Client.areas || []
        };
      }
      return null;
    }, { timeout: 30000 }).then(handle => handle.jsonValue()).catch(() => null);

    if (baseData && baseData.employees) {
      console.log(`[Scraper] ✔ Đã lấy được dữ liệu JSON gốc của Base.vn: ${baseData.employees.length} nhân viên`);

      const networkMap = {};
      if (baseData.networks) {
        baseData.networks.forEach(net => {
          networkMap[net.id] = net.name;
        });
      }
      const areaMap = {};
      const positionMap = {};
      if (baseData.areas) {
        baseData.areas.forEach(area => {
          areaMap[area.id] = area.name;
          if (area.items) {
            area.items.forEach(item => {
              positionMap[item.id] = item.name;
            });
          }
        });
      }

      employees = baseData.employees.map((emp, idx) => {
        // Xử lý ngày tháng từ timestamp
        const formatDate = (ts) => {
          if (!ts || ts === "0" || ts === 0) return "";
          const d = new Date(parseInt(ts) * 1000);
          return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
        };

        // Tìm tên phòng ban (nếu có trong dữ liệu)
        let deptName = "";
        if (emp.area_id && areaMap[emp.area_id]) deptName = areaMap[emp.area_id];
        else if (emp.dept_id && networkMap[emp.dept_id]) deptName = networkMap[emp.dept_id];
        else if (emp.dept_ids && emp.dept_ids.length > 0 && networkMap[emp.dept_ids[0]]) deptName = networkMap[emp.dept_ids[0]];

        // Xử lý thông tin hợp đồng
        const contract = emp.contract_export || {};
        const contractName = contract.name || "";
        const contractEnd = contract.end_date ? formatDate(contract.end_date) : "";

        // Sinh nhật
        let bday = "";
        if (emp.dob && emp.dob.day && emp.dob.month && emp.dob.year) {
          bday = `${String(emp.dob.day).padStart(2, "0")}/${String(emp.dob.month).padStart(2, "0")}/${emp.dob.year}`;
        } else if (emp.real_dob) {
          bday = emp.real_dob;
        }

        return {
          _idx: idx + 1,
          empCode: emp.code || `EMP_${String(idx + 1).padStart(3, "0")}`,
          fullName: emp.name || `${emp.last_name || ""} ${emp.first_name || ""}`.trim(),
          positionName: (emp.position_id && positionMap[emp.position_id]) ? positionMap[emp.position_id] : (emp.title || ""),
          positionIdRaw: emp.position_id || "",
          departmentName: deptName,

          birthday: bday,
          startDate: formatDate(emp.start_date || emp.official_start_date),
          startDateOffice: formatDate(emp.official_start_date || emp.start_date),
          gender: emp.gender === "2" ? "female" : "male",

          contractRaw: contractName,
          endDateRaw: contractEnd,

          phone: emp.phone || "",
          email: emp.email || "",
          salary: parseFloat(emp.salary) || parseFloat(emp.basic_salary) || 0,
          status: emp.is_terminated === "1" ? "inactive" : "active",
        };
      });
    } else {
      console.log(`[Scraper] ✘ Không tìm thấy biến window.Client. Quét HTML...`);
    }

    // Loại trùng
    const seen = new Set();
    employees = employees.filter(e => {
      const k = e.empCode || e.fullName;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    await browser.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { }

    if (employees.length === 0) {
      return res.status(200).json({
        success: false,
        message: "Không tìm thấy dữ liệu nhân viên. Kiểm tra URL hoặc đăng nhập Base.vn trước.",
        employees: [],
      });
    }

    console.log(`[Scraper] Hoàn tất: ${employees.length} nhân viên`);
    return res.status(200).json({
      success: true,
      message: `Cào thành công ${employees.length} nhân viên`,
      employees,
    });
  } catch (error) {
    if (browser) await browser.close().catch(() => { });
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { }
    console.error("[Scraper] Lỗi:", error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi khi cào dữ liệu: ${error.message}`,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/scrape/syncEmployees
// Body: { employees: [...] }
// ─────────────────────────────────────────────
export const syncEmployees = async (req, res) => {
  try {
    const data = req.body.employees || req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách nhân viên không hợp lệ" });
    }

    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    // Lấy trước toàn bộ positions và departments từ DB để map động
    const allPositions = await Position.find();
    const allDepartments = await Department.find();

    for (const emp of data) {
      try {
        const empCode = emp.empCode?.trim();
        if (!empCode || !emp.fullName?.trim()) {
          results.skipped++;
          continue;
        }

        const endDateOfContract =
          parseDate(emp.endDateRaw) ||
          parseDate(emp.contractRaw) ||
          null;

        const contractType = mapContractType(emp.contractRaw);
        const startDate = parseDate(emp.startDate);
        const startDateOffice = parseDate(emp.startDateOffice);
        const birthday = parseDate(emp.birthday);

        let positionId = null;
        let departmentId = null;

        if (emp.positionName) {
          // Tìm loại vị trí (Position) dựa trên keywords trong DB
          const matchedPos = findMappingDynamic(emp.positionName, allPositions);
          if (matchedPos) {
            positionId = matchedPos._id;
          } else {
            // Nếu vẫn không tìm thấy, có thể tự động tạo
            let pos = await Position.findOne({ name: { $regex: new RegExp(`^${emp.positionName.trim()}$`, "i") } });
            if (!pos) pos = await Position.create({ name: emp.positionName.trim(), keywords: [emp.positionName.trim()] });
            positionId = pos._id;
            // Refresh lại list cho vòng lặp sau
            allPositions.push(pos);
          }
        }

        if (emp.departmentName) {
          // Tìm phòng ban (Department) dựa vào tên phòng ban và keywords trong DB
          const matchedDept = findMappingDynamic(emp.departmentName, allDepartments);
          if (matchedDept) {
            departmentId = matchedDept._id;
          } else {
            // Tự động tạo phòng ban nếu không có
            let dept = await Department.findOne({ name: { $regex: new RegExp(`^${emp.departmentName.trim()}$`, "i") } });
            if (!dept) dept = await Department.create({ name: emp.departmentName.trim(), keywords: [emp.departmentName.trim()] });
            departmentId = dept._id;
            allDepartments.push(dept);
          }
        }

        const payload = {
          fullName: emp.fullName.trim(),
          positionName: emp.positionName || "",
          departmentName: emp.departmentName || "",
          // Đặt là null thay vì undefined để Mongoose xoá giá trị cũ nếu không tìm thấy
          position: positionId || null,
          department: departmentId || null,
          ...(startDate && { startDate }),
          ...(startDateOffice && { startDateOffice }),
          // birthday: chỉ set khi thực sự có giá trị
          ...(birthday && { birthday }),
          // endDateOfContract: null khi không có
          ...(endDateOfContract ? { endDateOfContract } : { endDateOfContract: null }),
          contractType,
          gender: emp.gender || "male",
          phone: emp.phone || "Chưa cập nhật",
          email: emp.email || "",
          salary: emp.salary || 0,
          status: emp.status || "active",
          note: `Đồng bộ từ Base.vn – ${new Date().toLocaleDateString("vi-VN")}`,
        };

        const existing = await Employee.findOne({ empCode });

        if (existing) {
          // Khi update: tách riêng $set và $unset
          const $set = {};
          const $unset = {};
          for (const [k, v] of Object.entries(payload)) {
            if (v === undefined) continue;
            if (v === null) {
              $unset[k] = 1;
            } else {
              $set[k] = v;
            }
          }

          const updateDoc = {};
          if (Object.keys($set).length > 0) updateDoc.$set = $set;
          if (Object.keys($unset).length > 0) updateDoc.$unset = $unset;

          // Debug log để xem Mongoose update doc là gì
          if (updateDoc.$unset && updateDoc.$unset.endDateOfContract) {
            console.log(`[Sync] Đang xoá endDateOfContract cho ${empCode} bằng $unset...`);
          }

          await Employee.updateOne({ empCode }, updateDoc);
          results.updated++;
        } else {
          // Khi tạo mới: loại bỏ hoàn toàn field nếu nó null
          const createPayload = {
            empCode,
            ...payload,
            startDate: payload.startDate || new Date(),
            birthday: payload.birthday || null,
          };
          // Xóa hoàn toàn field nếu null để MongoDB không lưu
          if (createPayload.endDateOfContract === null) {
            delete createPayload.endDateOfContract;
          }

          await Employee.create(createPayload);
          results.inserted++;
        }
      } catch (err) {
        results.errors.push({ empCode: emp.empCode, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Đồng bộ hoàn tất: ${results.inserted} thêm mới, ${results.updated} cập nhật, ${results.skipped} bỏ qua`,
      results,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
