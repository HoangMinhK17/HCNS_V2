import api from "./api";

// ─── Đường dẫn base cho Hóa đơn điện tử ─────────────────────────────────────
// baseURL của axios instance = http://localhost:3001/api/v1/fumee
// → Tất cả path bên dưới là tương đối so với baseURL đó

// ─── DASHBOARD & DANH SÁCH ────────────────────────────────────────────────────

/** Lấy tổng quan dashboard + danh sách hóa đơn gần nhất (từ Redis cache).
 *  @param {boolean} forceRefresh - true → thêm ?refresh=true để xóa cache Redis trước khi trả về */
const getInvoiceDashboard = async (forceRefresh = false) => {
  const response = await api.get("/invoices/status", {
    params: forceRefresh ? { refresh: "true" } : undefined,
  });
  return response.data;
};

/** Lấy danh sách hóa đơn điện tử (có phân trang, lọc, tìm kiếm, cached Redis).
 *  @param {object} params - { page, limit, search, status, startDate, endDate, refresh } */
const getInvoices = async (params = {}) => {
  const response = await api.get("/invoices/list", { params });
  return response.data;
};

// ─── GDT PUPPETEER SESSION ────────────────────────────────────────────────────

/** Lấy trạng thái phiên Puppeteer hiện tại */
const getGdtPuppetStatus = async () => {
  const response = await api.get("/invoices/gdt/puppet/status");
  return response.data;
};

/** Khởi động phiên Puppeteer (mở Chrome + lấy Captcha) */
const startGdtSession = async () => {
  const response = await api.post("/invoices/gdt/puppet/start");
  return response.data;
};

/** Đăng nhập GDT với Captcha trong cùng Puppeteer session */
const submitGdtLogin = async ({ captcha, username, password, startDate, endDate }) => {
  const response = await api.post(
    `/invoices/gdt/puppet/login`,
    { captcha, username, password },
    { params: { startDate, endDate } }
  );
  return response.data;
};

/** Kéo hóa đơn từ GDT trong cùng session Puppeteer đã đăng nhập */
const scrapeGdtInvoices = async ({ startDate, endDate, size = 100 }) => {
  const response = await api.get("/invoices/gdt/puppet/invoices", {
    params: { startDate, endDate, size },
  });
  return response.data;
};

/** Đóng phiên Puppeteer */
const closeGdtSession = async () => {
  const response = await api.post("/invoices/gdt/puppet/close");
  return response.data;
};

// ─── GDT DIRECT API (fallback khi có cookie thủ công) ────────────────────────

/** Lấy ảnh Captcha từ GDT Direct API */
const getGdtCaptcha = async () => {
  const response = await api.get("/invoices/gdt/captcha");
  return response.data;
};

/** Cập nhật Token/Cookie GDT thủ công */
const setGdtToken = async (values) => {
  const response = await api.post("/invoices/gdt/set-token", values);
  return response.data;
};

/** Tải và lưu file XML gốc hóa đơn từ GDT (Direct API) */
const downloadXmlFromGdt = async (id) => {
  const response = await api.post(`/invoices/gdt/download-xml/${id}`);
  return response.data;
};

// ─── MISA AMIS ────────────────────────────────────────────────────────────────

/** Cập nhật Token MISA AMIS */
const setMisaToken = async (values) => {
  const response = await api.post("/invoices/misa/set-token", values);
  return response.data;
};

/** Đẩy 1 hóa đơn sang MISA dạng PU Voucher (Chứng từ Mua hàng) */
const pushPuVoucherToMisa = async ({ invoiceId, vendorId = "GUID_NHA_CUNG_CAP_MISA" }) => {
  const response = await api.post("/invoices/misa/pu-voucher", { invoiceId, vendorId });
  return response.data;
};

// ─── XÓA HÓA ĐƠN ─────────────────────────────────────────────────────────────

/** Xóa 1 hóa đơn khỏi CSDL */
const deleteInvoice = async (id) => {
  const response = await api.delete(`/invoices/${id}`);
  return response.data;
};

/** Xóa nhiều hóa đơn cùng lúc */
const bulkDeleteInvoices = async (ids) => {
  const response = await api.post("/invoices/bulk-delete", { ids });
  return response.data;
};

// ─── DOWNLOAD FILE (XML / PDF / ZIP) ─────────────────────────────────────────

/** Tạo URL để mở PDF bản thể hiện hóa đơn trong tab mới */
const getInvoicePdfUrl = (id) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1/fumee";
  return `${base}/invoices/${id}/pdf`;
};

/** Tải file XML gốc hóa đơn (trả về axios response để lấy Blob) */
const downloadInvoiceXmlFile = async (id) => {
  const response = await api.get(`/invoices/${id}/xml`, { responseType: "blob" });
  return response;
};

/** Tải trọn bộ hóa đơn dạng ZIP (PDF + XML).
 *  @param {string[]} ids - danh sách _id cần tải, rỗng = tải tất cả */
const downloadInvoicesZip = async (ids = []) => {
  const response = await api.post(
    "/invoices/download-zip",
    { ids },
    { responseType: "blob" }
  );
  return response;
};

export {
  // Dashboard & Danh sách
  getInvoiceDashboard,
  getInvoices,
  // GDT Puppeteer Session
  getGdtPuppetStatus,
  startGdtSession,
  submitGdtLogin,
  scrapeGdtInvoices,
  closeGdtSession,
  // GDT Direct API
  getGdtCaptcha,
  setGdtToken,
  downloadXmlFromGdt,
  // MISA AMIS
  setMisaToken,
  pushPuVoucherToMisa,
  // Xóa hóa đơn
  deleteInvoice,
  bulkDeleteInvoices,
  // Download file
  getInvoicePdfUrl,
  downloadInvoiceXmlFile,
  downloadInvoicesZip,
};
