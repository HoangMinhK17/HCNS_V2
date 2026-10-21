import express from "express";
import {
  getGdtCaptcha,
  loginGdt,
  setGdtTokenManually,
  pullInboundInvoices,
  downloadInvoiceXml,
  loginMisa,
  setMisaTokenManually,
  pushPuVoucherToMisa,
  pushCaReceiptToMisa,
  pushCaPaymentToMisa,
  getSyncDashboardStatus,
  getInvoicesList,
  deleteInvoice,
  bulkDeleteInvoices,
} from "../controllers/invoiceIntegrationController.js";

import {
  startGdtSession,
  submitGdtLogin,
  scrapeGdtInvoices,
  scrapeGdtInvoiceXml,
  getGdtSessionStatus,
  closeGdtSession,
  downloadInvoiceXmlFile,
  downloadInvoicePdfFile,
  downloadInvoicesZipFile,
} from "../controllers/gdtPuppeteerController.js";
import { heavyLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Tổng quan Dashboard, Danh sách HĐĐT & Trạng thái kết nối (Redis cached)
router.get("/status", getSyncDashboardStatus);
router.get("/", getInvoicesList);
router.get("/list", getInvoicesList);
router.get("/invoices", getInvoicesList);

// Xóa hóa đơn trong CSDL
router.delete("/:id", deleteInvoice);
router.delete("/invoices/:id", deleteInvoice);
router.post("/bulk-delete", bulkDeleteInvoices);
router.post("/invoices/bulk-delete", bulkDeleteInvoices);

// Tải file XML, PDF và ZIP (Trọn bộ hóa đơn)
router.get("/:id/xml", heavyLimiter, downloadInvoiceXmlFile);
router.get("/invoices/:id/xml", heavyLimiter, downloadInvoiceXmlFile);
router.get("/:id/pdf", heavyLimiter, downloadInvoicePdfFile);
router.get("/invoices/:id/pdf", heavyLimiter, downloadInvoicePdfFile);
router.post("/download-zip", heavyLimiter, downloadInvoicesZipFile);
router.post("/invoices/download-zip", heavyLimiter, downloadInvoicesZipFile);

// ── LUỒNG 1A: Puppeteer Session (Đăng nhập Captcha trên Modal ERP — không bị 403) ──
router.get("/gdt/puppet/status", getGdtSessionStatus);
router.post("/gdt/puppet/start", heavyLimiter, startGdtSession);      // Khởi động browser + lấy captcha gửi về Modal
router.post("/gdt/puppet/login", heavyLimiter, submitGdtLogin);       // Đăng nhập trong cùng browser session
router.get("/gdt/puppet/invoices", heavyLimiter, scrapeGdtInvoices);  // Kéo HĐ trong cùng session
router.post("/gdt/puppet/xml/:id", heavyLimiter, scrapeGdtInvoiceXml); // Tải XML
router.post("/gdt/puppet/close", closeGdtSession);                    // Đóng browser

// ── LUỒNG 1B: Direct API (chỉ dùng nếu có cookie hợp lệ từ browser) ──
router.get("/gdt/captcha", getGdtCaptcha);
router.post("/gdt/login", loginGdt);
router.post("/gdt/set-token", setGdtTokenManually);
router.get("/gdt/invoices", pullInboundInvoices);
router.post("/gdt/download-xml/:id", downloadInvoiceXml);

// ── Luồng 2 & 3: MISA AMIS ──
router.post("/misa/login", loginMisa);
router.post("/misa/set-token", setMisaTokenManually);
router.post("/misa/pu-voucher", pushPuVoucherToMisa);
router.post("/misa/ca-receipt", pushCaReceiptToMisa);
router.post("/misa/ca-payment", pushCaPaymentToMisa);

export default router;

