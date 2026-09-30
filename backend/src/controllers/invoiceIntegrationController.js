import crypto from "crypto";
import GdtInvoice from "../models/GdtInvoice.js";
import MisaFinanceSync from "../models/MisaFinanceSync.js";

// Session / Token Cache in-memory
const AUTH_CACHE = {
  gdt: {
    token: "",
    cookie: "",     // raw cookie string từ browser: "jwt=xxx; JSESSIONID=yyy; ..."
    sessionId: "",  // JSESSIONID riêng (tự extract)
    mst: "0109120256",
    expiresAt: null
  },
  misa: {
    token: "",
    branchId: "243df488-5bc6-4f31-8125-23afd8ce4548",
    username: "huyenptt2202@gmail.com",
    expiresAt: null
  }
};

/**
 * Helper: Build đầy đủ headers giống browser cho mọi request tới GDT.
 * GDT chặn 403 nếu thiếu Referer / Origin / Cookie đầy đủ.
 */
const buildGdtHeaders = (extra = {}) => {
  const token = AUTH_CACHE.gdt.token;

  // Xây dựng cookie string:
  // Ưu tiên cookie thô từ browser (đã gồm jwt + JSESSIONID).
  // Nếu không có cookie thô, ghép thủ công từ token.
  let cookieStr = AUTH_CACHE.gdt.cookie || "";
  if (!cookieStr && token) {
    cookieStr = `jwt=${token}`;
    if (AUTH_CACHE.gdt.sessionId) {
      cookieStr += `; JSESSIONID=${AUTH_CACHE.gdt.sessionId}`;
    }
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://hoadondientu.gdt.gov.vn/",
    "Origin": "https://hoadondientu.gdt.gov.vn",
    "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    ...extra
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookieStr) headers["Cookie"] = cookieStr;

  return headers;
};

/**
 * Helper: Extract JSESSIONID từ chuỗi Set-Cookie response
 */
const extractSessionId = (setCookieHeader) => {
  if (!setCookieHeader) return "";
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const c of cookies) {
    const match = c.match(/JSESSIONID=([^;]+)/);
    if (match) return match[1];
  }
  return "";
};

// ─────────────────────────────────────────────────────────────
// 1. TỔNG CỤC THUẾ (GDT HĐĐT) APIS
// ─────────────────────────────────────────────────────────────

/**
 * 1.1 Lấy Captcha từ Tổng Cục Thuế
 */
export const getGdtCaptcha = async (req, res) => {
  try {
    const response = await fetch("https://hoadondientu.gdt.gov.vn/query/auth/captcha", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Lỗi kết nối máy chủ Tổng Cục Thuế (${response.status})`
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("[GDT Captcha Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 1.2 Đăng nhập Tổng Cục Thuế với Captcha
 */
export const loginGdt = async (req, res) => {
  try {
    const { username = "0109120256", password = "Intra2026@", captcha, ckey } = req.body;

    if (!captcha || !ckey) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã captcha và captcha key"
      });
    }

    // Mã hóa mật khẩu SHA-256 theo chuẩn GDT
    const cpassword = crypto.createHash("sha256").update(password).digest("hex");

    const payload = {
      username,
      password,
      cpassword,
      captcha: captcha.trim().toUpperCase(),
      ckey
    };

    const response = await fetch("https://hoadondientu.gdt.gov.vn/query/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
        "Referer": "https://hoadondientu.gdt.gov.vn/",
        "Origin": "https://hoadondientu.gdt.gov.vn",
        "sec-ch-ua": '"Google Chrome";v="125"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...(AUTH_CACHE.gdt.cookie ? { "Cookie": AUTH_CACHE.gdt.cookie } : {})
      },
      body: JSON.stringify(payload)
    });

    // Lưu JSESSIONID từ Set-Cookie response nếu có
    const setCookieRaw = response.headers.get("set-cookie") || response.headers.getSetCookie?.()?.join("; ") || "";
    const jsessionId = extractSessionId(setCookieRaw);

    const data = await response.json();

    if (!response.ok || !data.token) {
      return res.status(400).json({
        success: false,
        message: data.message || "Đăng nhập Tổng Cục Thuế thất bại. Vui lòng kiểm tra lại Captcha hoặc mật khẩu.",
        data
      });
    }

    // Lưu Token và Session vào memory cache
    AUTH_CACHE.gdt.token = data.token;
    AUTH_CACHE.gdt.mst = username;
    AUTH_CACHE.gdt.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (jsessionId) {
      AUTH_CACHE.gdt.sessionId = jsessionId;
      // Nếu chưa có cookie thô, tự build từ token + sessionId
      if (!AUTH_CACHE.gdt.cookie) {
        AUTH_CACHE.gdt.cookie = `jwt=${data.token}; JSESSIONID=${jsessionId}`;
      }
    } else if (!AUTH_CACHE.gdt.cookie) {
      AUTH_CACHE.gdt.cookie = `jwt=${data.token}`;
    }

    return res.status(200).json({
      success: true,
      message: "Đăng nhập Tổng Cục Thuế thành công!",
      token: data.token,
      user: data.user,
      note: jsessionId
        ? "Đã lưu cả JWT và JSESSIONID. Hệ thống sẵn sàng kéo hóa đơn."
        : "Đã lưu JWT. Nếu vẫn bị 403 hãy copy toàn bộ Cookie từ DevTools và nhập vào 'Nhập Token TCT'."
    });
  } catch (error) {
    console.error("[GDT Login Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 1.3 Cập nhật thủ công Token / Cookie GDT (nếu user tự đăng nhập bằng trình duyệt)
 */
export const setGdtTokenManually = (req, res) => {
  const { token, cookie, sessionId, mst = "0109120256" } = req.body;
  if (!token && !cookie) {
    return res.status(400).json({ success: false, message: "Cần cung cấp token hoặc cookie" });
  }

  if (token) AUTH_CACHE.gdt.token = token.replace(/^Bearer\s+/i, "").trim();
  if (cookie) AUTH_CACHE.gdt.cookie = cookie.trim();
  if (sessionId) AUTH_CACHE.gdt.sessionId = sessionId.trim();
  AUTH_CACHE.gdt.mst = mst;
  AUTH_CACHE.gdt.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Nếu có cookie thô chứa jwt= → tự extract token
  if (cookie && !token) {
    const jwtMatch = cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
    if (jwtMatch) AUTH_CACHE.gdt.token = jwtMatch[1].trim();
  }

  // Tự extract JSESSIONID từ cookie thô nếu có
  if (cookie && !sessionId) {
    const sMatch = cookie.match(/JSESSIONID=([^;]+)/);
    if (sMatch) AUTH_CACHE.gdt.sessionId = sMatch[1].trim();
  }

  return res.status(200).json({
    success: true,
    message: "Đã cập nhật Token/Cookie Tổng Cục Thuế thành công!",
    cache: {
      hasToken: !!AUTH_CACHE.gdt.token,
      hasCookie: !!AUTH_CACHE.gdt.cookie,
      hasSessionId: !!AUTH_CACHE.gdt.sessionId,
      mst: AUTH_CACHE.gdt.mst,
      cookiePreview: AUTH_CACHE.gdt.cookie.slice(0, 60) + "..."
    }
  });
};

/**
 * 1.4 Kéo danh sách hóa đơn Mua vào từ GDT
 */
export const pullInboundInvoices = async (req, res) => {
  try {
    const { 
      startDate = "01/09/2026", 
      endDate = "30/09/2026", 
      size = 50, 
      page = 0,
      tokenOverride 
    } = req.query;

    const token = tokenOverride || AUTH_CACHE.gdt.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Chưa có Token đăng nhập Tổng Cục Thuế. Vui lòng đăng nhập hoặc nhập Token."
      });
    }

    const searchQuery = `tdlap=ge=${startDate}T00:00:00;tdlap=le=${endDate}T23:59:59`;
    const url = `https://hoadondientu.gdt.gov.vn/api/query/invoices/purchase?sort=tdlap:desc&size=${size}&page=${page}&search=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: buildGdtHeaders()
    });

    if (!response.ok) {
      const errText = await response.text();
      const isHtml = errText.trim().startsWith("<");
      return res.status(response.status).json({
        success: false,
        message: `Lỗi kéo hóa đơn từ GDT (${response.status})`,
        detail: isHtml ? "GDT trả về HTML — Token hoặc Cookie hết hạn. Hãy dán lại toàn bộ Cookie từ DevTools." : errText.slice(0, 300)
      });
    }

    const data = await response.json();
    const invoiceList = data.datas || data.content || (Array.isArray(data) ? data : []);

    const savedInvoices = [];
    let insertedCount = 0;
    let skippedCount = 0;

    // Lưu vào CSDL MongoDB
    for (const inv of invoiceList) {
      try {
        const tgtttbso = Number(inv.tgtttbso || 0);
        const tgtthue = Number(inv.tgtthue || 0);
        const tgttoan = Number(inv.tgttoan || 0) || (tgtttbso + tgtthue);

        const updateData = {
          nbmst: (inv.nbmst || "").trim(),
          nbten: (inv.nbten || "").trim(),
          nbdchi: (inv.nbdchi || "").trim(),
          khhdon: (inv.khhdon || "").trim(),
          shdon: String(inv.shdon || "").trim().padStart(7, "0"),
          khmshdon: String(inv.khmshdon || "1").trim(),
          tdlap: inv.tdlap ? new Date(inv.tdlap) : new Date(),
          tgtttbso,
          tgtthue,
          tgttoan,
        };

        // Chỉ lấy Hóa đơn điện tử tiêu chuẩn (C...), bỏ qua Hóa đơn máy tính tiền (K...)
        if (updateData.khhdon && updateData.khhdon.toUpperCase().startsWith("K")) {
          continue;
        }

        const existing = await GdtInvoice.findOne({
          nbmst: updateData.nbmst,
          khhdon: updateData.khhdon,
          shdon: updateData.shdon,
        });

        if (existing) {
          if (!existing.tgttoan && updateData.tgttoan) {
            existing.tgttoan = updateData.tgttoan;
            existing.tgtttbso = updateData.tgtttbso;
            existing.tgtthue = updateData.tgtthue;
            await existing.save();
          }
          skippedCount++;
          savedInvoices.push(existing);
        } else {
          const doc = await GdtInvoice.create({
            ...updateData,
            sync_misa_status: "pending",
          });
          insertedCount++;
          savedInvoices.push(doc);
        }
      } catch (err) {
        console.warn("[Save Invoice Warning]:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Đã xử lý ${invoiceList.length} HĐ: Thêm mới ${insertedCount}, Đã có sẵn (bỏ qua): ${skippedCount}`,
      count: savedInvoices.length,
      insertedCount,
      skippedCount,
      totalInGdt: data.total || invoiceList.length,
      data: savedInvoices
    });
  } catch (error) {
    console.error("[Pull Invoices Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 1.5 Kéo XML gốc hóa đơn từ GDT và cập nhật vào CSDL
 */
export const downloadInvoiceXml = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await GdtInvoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn trong ERP" });
    }

    const token = AUTH_CACHE.gdt.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Chưa có Token Tổng Cục Thuế" });
    }

    const url = `https://hoadondientu.gdt.gov.vn/api/query/invoices/export-xml?nbmst=${encodeURIComponent(invoice.nbmst)}&khhdon=${encodeURIComponent(invoice.khhdon)}&shdon=${encodeURIComponent(invoice.shdon)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Không thể tải XML từ GDT (${response.status})`
      });
    }

    const xmlText = await response.text();
    invoice.xml_raw_data = xmlText;
    
    // Tạo item mẫu từ thông tin hóa đơn nếu chưa có danh sách chi tiết
    if (!invoice.items || invoice.items.length === 0) {
      invoice.items = [{
        item_code: "HH_" + invoice.shdon,
        item_name: "Hàng hóa/Dịch vụ theo HĐ " + invoice.shdon,
        unit: "Gói",
        quantity: 1,
        unit_price: invoice.tgtttbso,
        amount: invoice.tgtttbso,
        tax_rate: invoice.tgtttbso > 0 ? Math.round((invoice.tgtthue / invoice.tgtttbso) * 100) : 10,
        tax_amount: invoice.tgtthue,
        debit_account: "1561",
        credit_account: "331"
      }];
    }

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Đã tải và lưu trữ XML gốc vào CSDL ERP",
      invoice
    });
  } catch (error) {
    console.error("[Download XML Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────────────────────
// 2. MISA AMIS KẾ TOÁN APIS
// ─────────────────────────────────────────────────────────────

/**
 * 2.1 Đăng nhập MISA ID
 */
export const loginMisa = async (req, res) => {
  try {
    const { 
      Username = "huyenptt2202@gmail.com", 
      Password = "Intra2026@", 
      AppName = "ACTAPP",
      branchId = "243df488-5bc6-4f31-8125-23afd8ce4548" 
    } = req.body;

    const response = await fetch("https://id.misa.vn/api/v1/Auth/Login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username, Password, AppName })
    });

    const data = await response.json();

    if (!response.ok || !data.Data?.Token && !data.Token) {
      return res.status(400).json({
        success: false,
        message: data.Message || "Đăng nhập MISA ID không thành công",
        data
      });
    }

    const token = data.Data?.Token || data.Token;
    AUTH_CACHE.misa.token = token;
    AUTH_CACHE.misa.branchId = branchId;
    AUTH_CACHE.misa.username = Username;
    AUTH_CACHE.misa.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập MISA AMIS thành công!",
      token,
      branchId
    });
  } catch (error) {
    console.error("[MISA Login Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cập nhật Token MISA thủ công
 */
export const setMisaTokenManually = (req, res) => {
  const { token, branchId = "243df488-5bc6-4f31-8125-23afd8ce4548" } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập Token MISA" });
  }

  AUTH_CACHE.misa.token = token.replace(/^Bearer\s+/i, "");
  AUTH_CACHE.misa.branchId = branchId;
  AUTH_CACHE.misa.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return res.status(200).json({
    success: true,
    message: "Đã cập nhật Token MISA AMIS thành công!",
    cache: {
      hasToken: !!AUTH_CACHE.misa.token,
      branchId: AUTH_CACHE.misa.branchId
    }
  });
};

/**
 * Helper: Tự động Ghi sổ cái MISA
 */
const postToMisaLedger = async (refid, reftype, tableName) => {
  try {
    const payload = {
      refid,
      reftype,
      edit_version: 178706245,
      IsPostAfterSave: true,
      PassWarnings: {},
      allowOverOutwardStock: false,
      auditing_log: {
        refid,
        action_name: "Ghi sổ"
      },
      branchID: AUTH_CACHE.misa.branchId,
      tableName
    };

    const res = await fetch("https://actapp.misa.vn/g1/api/ledger/v1/ledger/post", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_CACHE.misa.token}`,
        "X-Branch-Id": AUTH_CACHE.misa.branchId,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    });

    return await res.json();
  } catch (err) {
    console.error("[Post Ledger Error]:", err);
    return { success: false, error: err.message };
  }
};

/**
 * 2.2 Đẩy Chứng từ Mua hàng sang MISA PU Voucher
 */
export const pushPuVoucherToMisa = async (req, res) => {
  try {
    const { invoiceId, vendorId = "GUID_NHA_CUNG_CAP_MISA", itemsOverride } = req.body;
    
    const invoice = await GdtInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    }

    if (!AUTH_CACHE.misa.token) {
      return res.status(401).json({ success: false, message: "Chưa cấu hình Token MISA AMIS" });
    }

    const items = itemsOverride || invoice.items || [];
    const detailsData = items.map((it) => ({
      inventory_item_id: it.inventory_item_id_misa || "GUID_VAT_TU_HANG_HOA_MISA",
      inventory_item_code: it.item_code || "VTHH_CHUNG",
      inventory_item_name: it.item_name || "Hàng hóa nhập",
      unit_id: it.unit || "CAI",
      stock_id: "KHO_TONG",
      quantity: it.quantity || 1,
      unit_price: it.unit_price || invoice.tgtttbso,
      amount: it.amount || invoice.tgtttbso,
      debit_account: it.debit_account || "1561",
      credit_account: it.credit_account || "331",
      tax_rate: it.tax_rate || 8,
      tax_amount: it.tax_amount || invoice.tgtthue,
      tax_account: "1331"
    }));

    const refNo = `CTM${Date.now().toString().slice(-6)}`;

    const misaPayload = [
      {
        Type: "pu_voucher",
        Key: null,
        RefType: 2010,
        RefTypeCategory: 201,
        OptionForSave: {
          PostAfterSave: true,
          FormState: "Add"
        },
        Object: {
          branch_id: AUTH_CACHE.misa.branchId,
          reftype: 2010,
          refdate: new Date().toISOString(),
          posted_date: new Date().toISOString(),
          refno: refNo,
          invoice_no: invoice.shdon,
          invoice_series: invoice.khhdon,
          invoice_template: invoice.khmshdon,
          invoice_date: invoice.tdlap.toISOString(),
          vendor_id: vendorId,
          vendor_name: invoice.nbten,
          vendor_address: invoice.nbdchi,
          journal_memo: `Mua hàng theo HĐ ${invoice.shdon} (${invoice.nbten}) đồng bộ từ ERP`,
          total_amount: invoice.tgtttbso,
          total_tax_amount: invoice.tgtthue,
          total_total_amount: invoice.tgttoan,
          edit_mode: 1
        },
        Details: [
          {
            Type: "pu_voucher_detail",
            Alias: "detail",
            Data: detailsData
          }
        ]
      }
    ];

    const response = await fetch("https://actapp.misa.vn/g1/api/pu/v1/pu_voucher/save_full", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_CACHE.misa.token}`,
        "X-Branch-Id": AUTH_CACHE.misa.branchId,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(misaPayload)
    });

    const data = await response.json();

    if (!response.ok || data.Success === false) {
      invoice.sync_misa_status = "failed";
      invoice.misa_sync_error = JSON.stringify(data);
      await invoice.save();

      return res.status(400).json({
        success: false,
        message: "Đẩy chứng từ Mua hàng sang MISA thất bại",
        data
      });
    }

    const createdRefId = data.Data?.refid || data.refid || "";

    // Tự động Ghi sổ cái
    if (createdRefId) {
      await postToMisaLedger(createdRefId, 2010, "pu_voucher");
    }

    invoice.sync_misa_status = "synced_misa";
    invoice.misa_ref_id = createdRefId;
    invoice.misa_ref_no = refNo;
    invoice.misa_synced_at = new Date();
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Đã đẩy Chứng từ Mua hàng và Ghi sổ sang MISA AMIS thành công!",
      refno: refNo,
      misaData: data
    });
  } catch (error) {
    console.error("[Push PU Voucher Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2.3 Đẩy Phiếu Thu Tiền Mặt (CA Receipt - 1010)
 */
export const pushCaReceiptToMisa = async (req, res) => {
  try {
    const {
      erpRefId = "",
      refno = `PT${Date.now().toString().slice(-6)}`,
      payer = "Nguyễn Văn A",
      accountingObjectId = "GUID_KHACH_HANG_HOAC_NV",
      accountingObjectName = "Khách Hàng Mẫu",
      journalMemo = "Thu tiền theo đề nghị tài chính ERP",
      totalAmount = 1000000,
      details = []
    } = req.body;

    if (!AUTH_CACHE.misa.token) {
      return res.status(401).json({ success: false, message: "Chưa cấu hình Token MISA AMIS" });
    }

    const payload = [
      {
        Type: "ca_receipt",
        Key: null,
        RefType: 1010,
        RefTypeCategory: 101,
        enableAutoSave: true,
        OptionForSave: {
          PostAfterSave: true,
          IsQuickEdit: false,
          FormState: "Add"
        },
        Object: {
          branch_id: AUTH_CACHE.misa.branchId,
          reftype: 1010,
          reason_type_id: 13,
          refdate: new Date().toISOString(),
          posted_date: new Date().toISOString(),
          refno,
          payer,
          accounting_object_id: accountingObjectId,
          accounting_object_name: accountingObjectName,
          journal_memo: journalMemo,
          total_amount: totalAmount,
          total_amount_oc: totalAmount,
          currency_id: "VND",
          exchange_rate: 1,
          edit_mode: 1
        },
        Details: [
          {
            Type: "ca_receipt_detail",
            Alias: "detail",
            View: "view_ca_receipt_detail",
            UseRecover: true,
            Data: details.length > 0 ? details : [
              {
                description: journalMemo,
                debit_account: "1111",
                credit_account: "131",
                amount: totalAmount,
                amount_oc: totalAmount,
                accounting_object_id: accountingObjectId
              }
            ]
          }
        ],
        Links: [
          {
            Type: "ca_receipt_payment_list",
            RefType: 1010,
            RefTypeCategory: 101
          }
        ]
      }
    ];

    const response = await fetch("https://actapp.misa.vn/g1/api/ca/v1/ca_receipt/full", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_CACHE.misa.token}`,
        "X-Branch-Id": AUTH_CACHE.misa.branchId,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.Success === false) {
      return res.status(400).json({ success: false, message: "Đẩy Phiếu Thu sang MISA thất bại", data });
    }

    const createdRefId = data.Data?.refid || data.refid || "";
    if (createdRefId) {
      await postToMisaLedger(createdRefId, 1010, "ca_receipt");
    }

    // Lưu log đồng bộ
    await MisaFinanceSync.create({
      voucher_type: "CA_RECEIPT",
      erp_ref_id: erpRefId,
      refno,
      accounting_object_id: accountingObjectId,
      accounting_object_name: accountingObjectName,
      journal_memo: journalMemo,
      total_amount: totalAmount,
      misa_ref_id: createdRefId,
      status: "posted_ledger",
      synced_at: new Date(),
      posted_ledger_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Đã tạo Phiếu Thu và Ghi sổ MISA thành công!",
      refno,
      data
    });
  } catch (error) {
    console.error("[CA Receipt Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2.4 Đẩy Phiếu Chi Tiền Mặt (CA Payment - 1020)
 */
export const pushCaPaymentToMisa = async (req, res) => {
  try {
    const {
      erpRefId = "",
      refno = `PC${Date.now().toString().slice(-6)}`,
      receiver = "Nguyễn Văn B",
      accountingObjectId = "GUID_NHAN_VIEN_HOAC_NCC",
      accountingObjectName = "Nguyễn Văn B (Nhân viên)",
      journalMemo = "Chi tiền tạm ứng/thanh toán theo đề nghị tài chính ERP",
      totalAmount = 2000000,
      details = []
    } = req.body;

    if (!AUTH_CACHE.misa.token) {
      return res.status(401).json({ success: false, message: "Chưa cấu hình Token MISA AMIS" });
    }

    const payload = [
      {
        Type: "ca_payment",
        Key: null,
        RefType: 1020,
        RefTypeCategory: 102,
        enableAutoSave: true,
        OptionForSave: {
          PostAfterSave: true,
          IsQuickEdit: false,
          FormState: "Add"
        },
        Object: {
          branch_id: AUTH_CACHE.misa.branchId,
          reftype: 1020,
          reason_type_id: 14,
          refdate: new Date().toISOString(),
          posted_date: new Date().toISOString(),
          refno,
          receiver,
          accounting_object_id: accountingObjectId,
          accounting_object_name: accountingObjectName,
          journal_memo: journalMemo,
          total_amount: totalAmount,
          total_amount_oc: totalAmount,
          currency_id: "VND",
          exchange_rate: 1,
          edit_mode: 1
        },
        Details: [
          {
            Type: "ca_payment_detail",
            Alias: "detail",
            Data: details.length > 0 ? details : [
              {
                description: journalMemo,
                debit_account: "141",
                credit_account: "1111",
                amount: totalAmount,
                amount_oc: totalAmount,
                accounting_object_id: accountingObjectId,
                cost_center_id: "PHONG_DU_AN"
              }
            ]
          }
        ]
      }
    ];

    const response = await fetch("https://actapp.misa.vn/g1/api/ca/v1/ca_payment/full", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_CACHE.misa.token}`,
        "X-Branch-Id": AUTH_CACHE.misa.branchId,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.Success === false) {
      return res.status(400).json({ success: false, message: "Đẩy Phiếu Chi sang MISA thất bại", data });
    }

    const createdRefId = data.Data?.refid || data.refid || "";
    if (createdRefId) {
      await postToMisaLedger(createdRefId, 1020, "ca_payment");
    }

    // Lưu log đồng bộ
    await MisaFinanceSync.create({
      voucher_type: "CA_PAYMENT",
      erp_ref_id: erpRefId,
      refno,
      accounting_object_id: accountingObjectId,
      accounting_object_name: accountingObjectName,
      journal_memo: journalMemo,
      total_amount: totalAmount,
      misa_ref_id: createdRefId,
      status: "posted_ledger",
      synced_at: new Date(),
      posted_ledger_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Đã tạo Phiếu Chi và Ghi sổ MISA thành công!",
      refno,
      data
    });
  } catch (error) {
    console.error("[CA Payment Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2.5 Lấy danh sách hóa đơn và tình trạng kết nối
 */
export const getSyncDashboardStatus = async (req, res) => {
  try {
    const totalInvoices = await GdtInvoice.countDocuments();
    const syncedMisaInvoices = await GdtInvoice.countDocuments({ sync_misa_status: "synced_misa" });
    const pendingInvoices = await GdtInvoice.countDocuments({ sync_misa_status: "pending" });
    const recentInvoices = await GdtInvoice.find().sort({ tdlap: -1 });
    const recentFinanceSync = await MisaFinanceSync.find().sort({ createdAt: -1 }).limit(10);

    return res.status(200).json({
      success: true,
      authStatus: {
        gdt: {
          hasToken: !!AUTH_CACHE.gdt.token,
          mst: AUTH_CACHE.gdt.mst,
          expiresAt: AUTH_CACHE.gdt.expiresAt
        },
        misa: {
          hasToken: !!AUTH_CACHE.misa.token,
          branchId: AUTH_CACHE.misa.branchId,
          username: AUTH_CACHE.misa.username,
          expiresAt: AUTH_CACHE.misa.expiresAt
        }
      },
      stats: {
        totalInvoices,
        syncedMisaInvoices,
        pendingInvoices
      },
      recentInvoices,
      recentFinanceSync
    });
  } catch (error) {
    console.error("[Dashboard Status Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa 1 hóa đơn khỏi CSDL
 */
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await GdtInvoice.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn cần xóa" });
    }
    return res.status(200).json({ success: true, message: "Đã xóa hóa đơn thành công", id });
  } catch (error) {
    console.error("[Delete Invoice Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa nhiều hóa đơn cùng lúc
 */
export const bulkDeleteInvoices = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất 1 hóa đơn để xóa" });
    }
    const result = await GdtInvoice.deleteMany({ _id: { $in: ids } });
    return res.status(200).json({
      success: true,
      message: `Đã xóa thành công ${result.deletedCount} hóa đơn`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("[Bulk Delete Invoices Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
