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
} from "../controllers/gdtPuppeteerController.js";

const router = express.Router();

// Tổng quan Dashboard & Trạng thái kết nối
router.get("/status", getSyncDashboardStatus);

// Xóa hóa đơn trong CSDL
router.delete("/invoices/:id", deleteInvoice);
router.post("/invoices/bulk-delete", bulkDeleteInvoices);

// ── LUỒNG 1A: Puppeteer Session (Đăng nhập Captcha trên Modal ERP — không bị 403) ──
router.get("/gdt/puppet/status", getGdtSessionStatus);
router.post("/gdt/puppet/start", startGdtSession);       // Khởi động browser + lấy captcha gửi về Modal
router.post("/gdt/puppet/login", submitGdtLogin);        // Đăng nhập trong cùng browser session
router.get("/gdt/puppet/invoices", scrapeGdtInvoices);   // Kéo HĐ trong cùng session
router.post("/gdt/puppet/xml/:id", scrapeGdtInvoiceXml); // Tải XML
router.post("/gdt/puppet/close", closeGdtSession);       // Đóng browser

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

