/**
 * GDT Puppeteer Controller
 * Dung Puppeteer quan ly phien lam viec voi Tong Cuc Thue.
 * - Dung page.goto() de keo hoa don (khong dung fetch() de tranh WAF 403)
 * - Tu dong keo hoa don ngay sau khi dang nhap thanh cong
 */

import puppeteer from "puppeteer";
import GdtInvoice from "../models/GdtInvoice.js";
import Company from "../models/Company.js";
import path from "path";
import os from "os";
import fs from "fs";
import { randomUUID } from "crypto";
import {
  fetchInvoiceXml,
  fetchInvoiceDetail,
  generateInvoiceHtml,
  renderPdfFromHtml,
  streamInvoicesZip
} from "../services/gdtInvoiceExportService.js";

let _browser = null;
let _page = null;
let _isLoggedIn = false;
let _gdtToken = "";
let _sessionStatus = "idle";

const SESSION = {
  captchaKey: "",
  captchaImageBase64: "",
  lastError: "",
  invoiceCount: 0,
  lastLoginTime: null,
};

const PROFILE_DIR = path.join(os.tmpdir(), "gdt_chrome_profile");
try {
  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
} catch (_) {}

const TOKEN_CACHE_FILE = path.join(PROFILE_DIR, "gdt_token_cache.json");

export const saveTokenToDisk = (token) => {
  try {
    if (token) {
      fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, savedAt: Date.now() }), "utf-8");
    }
  } catch (_) {}
};

export const loadTokenFromDisk = () => {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf-8"));
      if (data?.token && (Date.now() - (data.savedAt || 0) < 12 * 3600 * 1000)) {
        return data.token;
      }
    }
  } catch (_) {}
  return "";
};

_gdtToken = loadTokenFromDisk();
if (_gdtToken) {
  _isLoggedIn = true;
  _sessionStatus = "logged_in";
  console.log("[GDT] Đã khôi phục token phiên TCT từ cache!");
}

const closeBrowserInternal = async () => {
  try { if (_browser) await _browser.close(); } catch (_) {}
  _browser = null; _page = null; _isLoggedIn = false; _gdtToken = ""; _sessionStatus = "idle";
  try { if (fs.existsSync(TOKEN_CACHE_FILE)) fs.unlinkSync(TOKEN_CACHE_FILE); } catch (_) {}
};

const extractGdtToken = async () => {
  if (!_page || _page.isClosed()) return null;
  try {
    const t = await _page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const v = localStorage.getItem(localStorage.key(i));
        if (typeof v === "string" && v.includes("eyJ")) { const m = v.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); if (m) return m[0]; }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const v = sessionStorage.getItem(sessionStorage.key(i));
        if (typeof v === "string" && v.includes("eyJ")) { const m = v.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); if (m) return m[0]; }
      }
      return null;
    });
    if (t) return t;
    const cookies = await _page.cookies();
    const c = cookies.find(c => (c.name.toLowerCase().includes("jwt") || c.name.toLowerCase().includes("token")) && c.value?.includes("eyJ"));
    if (c) return c.value;
  } catch (_) {}
  return null;
};

/**
 * Chuyển ngày từ DD/MM/YYYY hoặc YYYY-MM-DD sang YYYY-MM-DD (ISO format cho GDT API)
 */
const parseDateToIso = (dateStr) => {
  if (!dateStr) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dateStr;
};

/**
 * Tạo bộ headers đầy đủ mà WAF của GDT yêu cầu
 * (y hệt curl request hoạt động được trên Postman)
 * Lưu ý: header value phải là ASCII thuần — tiếng Việt cần encodeURIComponent
 */
const buildGdtHeaders = (token, action = "Tìm kiếm (hóa đơn mua vào)") => ({
  "Authorization": token || "",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "vi",
  "Content-Type": "application/json",
  "Action": encodeURIComponent(action),           // URL-encode để tránh lỗi ByteString
  "Referer": "https://hoadondientu.gdt.gov.vn/tra-cuu/tra-cuu-hoa-don",
  "End-Point": "/tra-cuu/tra-cuu-hoa-don",
  "request-id": randomUUID(),
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Origin": "https://hoadondientu.gdt.gov.vn",
});

/**
 * Fetch 1 trang từ GDT API (max size=50 theo giới hạn server).
 */
const fetchGdtPage = async (searchQ, page, pageSize = 50) => {
  const apiUrl = `https://hoadondientu.gdt.gov.vn/api/query/invoices/purchase?sort=tdlap:desc&size=${pageSize}&page=${page}&search=${searchQ}`;
  console.log(`[GDT] Page ${page} fetch:`, apiUrl.slice(0, 220));

  const resp = await fetch(apiUrl, { method: "GET", headers: buildGdtHeaders(_gdtToken) });
  const bodyText = await resp.text();
  console.log(`[GDT] Page ${page} status:`, resp.status, "| body(300):", bodyText.slice(0, 300));

  if (!bodyText || bodyText.trim().length < 5)
    throw new Error(`API trang ${page} trả về rỗng (HTTP ${resp.status})`);

  let data;
  try { data = JSON.parse(bodyText); } catch (_) {
    throw new Error(`API trang ${page} không trả JSON hợp lệ (HTTP ${resp.status}): ` + bodyText.slice(0, 200));
  }

  if (resp.status === 403 || resp.status === 401 || data?.status === 403 || data?.status === 401)
    throw new Error(`API ${data?.status || resp.status}: ` + (data?.message || "Lỗi xác thực — phiên hết hạn"));

  if (resp.status >= 400)
    throw new Error(`API HTTP ${resp.status}: ` + (data?.message || bodyText.slice(0, 150)));

  return data;
};

/**
 * Gọi GDT API với phân trang — tự động lặp qua các trang cho đến khi lấy hết.
 * GDT giới hạn size tối đa 50 mỗi trang.
 * GDT dùng định dạng ngày DD/MM/YYYY trong search query.
 */
const scrapeViaGoto = async (startDate, endDate, _size) => {
  if (!_gdtToken) throw new Error("Chưa có JWT token GDT. Vui lòng đăng nhập lại.");

  const PAGE_SIZE = 50; // GDT API giới hạn tối đa 50
  // Không filter ttxly để lấy TẤT CẢ hóa đơn trong khoảng ngày
  const searchQ = `tdlap=ge=${startDate}T00:00:00;tdlap=le=${endDate}T23:59:59`;

  const allItems = [];
  let page = 0;
  let total = null;

  while (true) {
    const data = await fetchGdtPage(searchQ, page, PAGE_SIZE);

    // GDT trả về mảng trong field "datas"
    const items = data?.datas || data?.content || (Array.isArray(data) ? data : []);
    if (total === null) total = data?.total ?? items.length;

    console.log(`[GDT] Page ${page}: ${items.length} items | total server: ${total}`);
    allItems.push(...items);

    // Dừng nếu: trang rỗng, hoặc đã lấy đủ, hoặc ít hơn PAGE_SIZE (trang cuối)
    if (items.length === 0 || allItems.length >= total || items.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`[GDT] Tổng kéo được: ${allItems.length} / ${total} hóa đơn`);

  // Trả về dạng tương thích với code cũ
  return { datas: allItems, total: allItems.length };
};


const saveInvoices = async (list) => {
  const saved = [];
  let insertedCount = 0;
  let skippedCount = 0;

  for (const inv of list) {
    try {
      const tgtttbso = Number(inv.tgtttbso || 0);
      const tgtthue = Number(inv.tgtthue || 0);
      const tgttoan = Number(inv.tgttoan || 0) || (tgtttbso + tgtthue);

      const d = {
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
        tchat: inv.tchat || "Goc",
        thttlts: inv.thttlts || [],
      };

      // Chỉ lấy Hóa đơn điện tử tiêu chuẩn (C...), bỏ qua Hóa đơn máy tính tiền (K...)
      if (d.khhdon && d.khhdon.toUpperCase().startsWith("K")) {
        continue;
      }

      // So sánh theo MST bên bán + Ký hiệu + Số hóa đơn
      const existing = await GdtInvoice.findOne({
        nbmst: d.nbmst,
        khhdon: d.khhdon,
        shdon: d.shdon,
      });

      if (existing) {
        // Đã có trong CSDL -> Bỏ qua, không thêm mới
        if (!existing.tgttoan && d.tgttoan) {
          existing.tgttoan = d.tgttoan;
          existing.tgtttbso = d.tgtttbso;
          existing.tgtthue = d.tgtthue;
          await existing.save();
        }
        skippedCount++;
        saved.push(existing);
      } else {
        // Hóa đơn mới hoàn toàn -> Chỉ thêm mới hóa đơn này
        const doc = await GdtInvoice.create({
          ...d,
          sync_misa_status: "pending",
        });
        insertedCount++;
        saved.push(doc);
      }
    } catch (e) {
      console.warn("[GDT Save]:", e.message);
    }
  }

  console.log(`[GDT Save] Tổng xử lý: ${list.length} | Thêm mới: ${insertedCount} | Đã có (bỏ qua): ${skippedCount}`);
  return { saved, insertedCount, skippedCount, totalFetched: list.length };
};

export const startGdtSession = async (req, res) => {
  try {
    _sessionStatus = "launching"; SESSION.lastError = "";
    await closeBrowserInternal();
    const chromePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));
    console.log("[GDT] Khoi dong Chrome...");
    _browser = await puppeteer.launch({
      headless: false, executablePath: executablePath || undefined, userDataDir: PROFILE_DIR,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-blink-features=AutomationControlled","--window-size=1280,900"],
    });
    const pages = await _browser.pages();
    _page = pages.length > 0 ? pages[0] : await _browser.newPage();
    await _page.setViewport({ width: 1280, height: 900 });
    await _page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    // Bắt JWT token từ request headers
    _page.on("request", req => {
      try {
        const auth = req.headers()["authorization"];
        if (auth && auth.includes("eyJ")) {
          _gdtToken = auth.startsWith("Bearer ") ? auth : "Bearer " + auth;
          _isLoggedIn = true; _sessionStatus = "logged_in"; SESSION.lastLoginTime = new Date();
          saveTokenToDisk(_gdtToken);
          console.log("[GDT] JWT from request!");
        }
      } catch (_) {}
    });

    // Bắt JWT từ response body
    _page.on("response", async resp => {
      try {
        const url = resp.url();
        if (url.includes("authenticate") || url.includes("/auth")) {
          const text = await resp.text().catch(() => "");
          const m = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
          if (m && !_gdtToken) {
            _gdtToken = "Bearer " + m[0]; _isLoggedIn = true; _sessionStatus = "logged_in"; SESSION.lastLoginTime = new Date();
            saveTokenToDisk(_gdtToken);
            console.log("[GDT] JWT from response!");
          }
        }
      } catch (_) {}
    });

    // Mở trang GDT
    console.log("[GDT] Mo hoadondientu.gdt.gov.vn...");
    try { await _page.goto("https://hoadondientu.gdt.gov.vn/", { waitUntil: "networkidle2", timeout: 60000 }); }
    catch (_) { await _page.goto("https://hoadondientu.gdt.gov.vn/", { waitUntil: "domcontentloaded", timeout: 60000 }); }
    await new Promise(r => setTimeout(r, 3000));

    // Đóng popup không liên quan
    try {
      await _page.evaluate(() => {
        document.querySelectorAll(".ant-modal").forEach(m => {
          const isLogin = m.innerText.includes("Tên đăng nhập") || !!m.querySelector('input[type="password"]');
          if (!isLogin) { const x = m.querySelector(".ant-modal-close"); if (x) x.click(); }
        });
      });
      await new Promise(r => setTimeout(r, 800));
    } catch (_) {}

    // ── Tạo Promise chờ ảnh captcha từ network TRƯỚC khi click ──
    // Sau khi click "Đăng nhập", GDT sẽ mở modal và load ảnh captcha qua HTTP
    let _captchaResolve = null;
    const captchaWaitPromise = new Promise(resolve => { _captchaResolve = resolve; });

    const captchaResponseHandler = async resp => {
      try {
        const url = resp.url();
        const ct = resp.headers()["content-type"] || "";
        // GDT load captcha qua URL có "captcha", "cvalue", hoặc trả về image/*
        const isCaptchaUrl = url.includes("captcha") || url.includes("cvalue") || url.includes("kaptcha") || url.includes("verifycode");
        const isImageResp = ct.startsWith("image/");
        if ((isCaptchaUrl || isImageResp) && ct.startsWith("image/")) {
          console.log("[GDT] Captcha response detected! URL:", url.slice(0, 100), "CT:", ct);
          try {
            // Dùng arrayBuffer (Puppeteer v20+) hoặc buffer (cũ hơn)
            let buf;
            if (typeof resp.arrayBuffer === "function") {
              const ab = await resp.arrayBuffer();
              buf = Buffer.from(ab);
            } else {
              buf = await resp.buffer();
            }
            if (buf && buf.length > 100) {
              const ext = ct.includes("png") ? "png" : ct.includes("gif") ? "gif" : "jpeg";
              const b64 = "data:image/" + ext + ";base64," + buf.toString("base64");
              console.log("[GDT] ✅ Bắt được captcha từ network! Size:", buf.length, "bytes");
              _captchaResolve({ b64, key: "network_" + ext });
            }
          } catch (e) {
            console.warn("[GDT] Đọc buffer captcha lỗi:", e.message);
          }
        }
      } catch (_) {}
    };
    _page.on("response", captchaResponseHandler);

    // ── Click nút Đăng nhập ──
    console.log("[GDT] Click nut Dang nhap...");
    let clicked = false;
    for (const sel of [".home-header-menu-item", "button.home-header-menu-item", ".ant-btn-link"]) {
      try {
        const el = await _page.$(sel);
        if (el) {
          const txt = await el.evaluate(e => e.innerText?.trim());
          if (txt === "Đăng nhập" || txt?.includes("ng nh")) { await el.click(); clicked = true; console.log("[GDT] Clicked:", sel); break; }
        }
      } catch (_) {}
    }
    if (!clicked) {
      clicked = await _page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("*")).find(
          e => e.offsetParent !== null && e.innerText?.trim() === "\u0110\u0103ng nh\u1eadp" && !e.closest(".ant-modal")
        );
        if (btn) { btn.click(); return true; } return false;
      });
      console.log("[GDT] Clicked via evaluate:", clicked);
    }

    // ── Chờ modal mở + ảnh captcha load ──
    // Chờ tối đa 8 giây để network bắt được ảnh captcha
    const captchaFromNetwork = await Promise.race([
      captchaWaitPromise,
      new Promise(r => setTimeout(() => r(null), 8000))
    ]);
    _page.off("response", captchaResponseHandler); // Dọn dẹp listener

    // Đảm bảo modal đã mở
    try { await _page.waitForSelector('input[type="password"]', { timeout: 4000 }); console.log("[GDT] ✅ Modal open!"); }
    catch (_) { console.warn("[GDT] No password input found"); }
    await new Promise(r => setTimeout(r, 300));
    let captchaB64 = null, captchaKey = "unknown";

    // Ưu tiên 0: Dùng ảnh captcha đã bắt từ network (Promise-based)
    if (captchaFromNetwork?.b64) {
      captchaB64 = captchaFromNetwork.b64;
      captchaKey = captchaFromNetwork.key || "network_intercepted";
      console.log("[GDT] ✅ Dùng captcha từ network intercept!");
    }

    // Ưu tiên 1: Tìm <img> captcha trong DOM modal
    if (!captchaB64) {
      try {
        const found = await _page.evaluate(() => {
          const modals = Array.from(document.querySelectorAll('.ant-modal-content, [role="dialog"]'));
          const lm = modals.find(m => m.offsetParent !== null && (m.querySelector('input[type="password"]') || m.innerText.includes("n \u0111\u0103ng nh\u1eadp")));
          if (!lm) return null;
          for (const img of lm.querySelectorAll("img")) {
            if (img.src?.startsWith("data:image") && img.src.length > 100) return { type: "img_data", content: img.src };
            if (img.src?.startsWith("http") || img.src?.startsWith("/")) return { type: "img_url", content: img.src };
          }
          for (const c of lm.querySelectorAll("canvas")) {
            if (c.width > 50) { try { return { type: "canvas", content: c.toDataURL("image/png") }; } catch (_) {} }
          }
          for (const s of lm.querySelectorAll("svg")) {
            if (!s.closest(".ant-modal-close") && s.outerHTML.length > 100)
              return { type: "svg", content: "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(s.outerHTML))) };
          }
          return null;
        });
        if (found?.content) {
          if (found.type === "img_url") {
            // Tải ảnh từ URL rồi chuyển base64
            const imgUrl = found.content.startsWith("/") ? "https://hoadondientu.gdt.gov.vn" + found.content : found.content;
            const cookies = await _page.cookies();
            const cookieStr = cookies.map(c => c.name + "=" + c.value).join("; ");
            // Navigate đến URL captcha để lấy buffer
            const imgPage = await _browser.newPage();
            try {
              await imgPage.setExtraHTTPHeaders({ Cookie: cookieStr });
              const imgResp = await imgPage.goto(imgUrl, { timeout: 10000 });
              const buf = await imgResp.buffer();
              captchaB64 = "data:image/png;base64," + buf.toString("base64");
              captchaKey = "img_url_fetched";
              console.log("[GDT] ✅ Captcha tải từ URL:", imgUrl.slice(0, 60));
            } catch (e) {
              console.warn("[GDT] Fetch img URL lỗi:", e.message);
            } finally {
              await imgPage.close().catch(() => {});
            }
          } else {
            captchaB64 = found.content;
            captchaKey = found.type;
            console.log("[GDT] ✅ Captcha từ DOM (", found.type, ")");
          }
        }
      } catch (e) { console.warn("[GDT] DOM captcha err:", e.message); }
    }

    // Ưu tiên 2: Chụp chỉ phần LOGIN MODAL (không phải toàn trang)
    if (!captchaB64) {
      try {
        const handles = await _page.$$('.ant-modal-content, [role="dialog"]');
        for (const h of handles) {
          const il = await h.evaluate(el => !!el.querySelector('input[type="password"]') || el.innerText.includes("n \u0111\u0103ng nh\u1eadp")).catch(() => false);
          if (!il) continue;
          // Thử chụp element captcha riêng
          for (const sel of ["canvas", "img:not([class*='logo'])", "svg:not([class*='icon'])", "img"]) {
            const el = await h.$(sel);
            if (el) {
              const box = await el.boundingBox();
              if (box && box.width > 40 && box.height > 20) {
                const b = await el.screenshot({ encoding: "base64" }).catch(() => null);
                if (b && b.length > 200) { captchaB64 = "data:image/png;base64," + b; captchaKey = "modal_elem_" + sel.split(":")[0]; break; }
              }
            }
          }
          // Nếu không có element captcha riêng → chụp TOÀN BỘ modal
          if (!captchaB64) {
            const b = await h.screenshot({ encoding: "base64" }).catch(() => null);
            if (b && b.length > 500) { captchaB64 = "data:image/png;base64," + b; captchaKey = "modal_screenshot"; console.log("[GDT] ✅ Chụp modal!"); }
          }
          if (captchaB64) break;
        }
      } catch (e) { console.warn("[GDT] Modal screenshot:", e.message); }
    }

    // Ưu tiên 3: Fullpage (last resort) — chỉ dùng khi không còn cách nào
    if (!captchaB64) {
      try {
        const b = await _page.screenshot({ encoding: "base64", fullPage: false });
        if (b && b.length > 500) { captchaB64 = "data:image/png;base64," + b; captchaKey = "fullpage_screenshot"; console.log("[GDT] Fullpage fallback!"); }
      } catch (e) { console.error("[GDT] Screenshot err:", e.message); }
    }

    if (!captchaB64) throw new Error("Khong the lay anh captcha. Kiem tra ket noi mang.");
    SESSION.captchaKey = captchaKey; SESSION.captchaImageBase64 = captchaB64; _sessionStatus = "captcha_wait";
    const isFS = captchaKey === "fullpage_screenshot";
    const isModal = captchaKey === "modal_screenshot";
    return res.status(200).json({
      success: true,
      message: isFS
        ? "Nhin vao cua so Chrome dang mo tren man hinh va nhap ma Captcha ban thay."
        : isModal
        ? "Anh chup man hinh form dang nhap. Tim ma Captcha trong anh va nhap vao o ben duoi."
        : "Da lay ma Captcha! Nhap ma vao o ben duoi.",
      captchaImage: captchaB64, captchaKey,
      isFullscreenFallback: isFS,
      isModalFallback: isModal,
      sessionStatus: _sessionStatus
    });
  } catch (error) {
    _sessionStatus = "error"; SESSION.lastError = error.message;
    console.error("[GDT Start Error]:", error.message);
    await closeBrowserInternal();
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitGdtLogin = async (req, res) => {
  const { captcha, username: reqUsername, password: reqPassword } = req.body;
  if (!captcha?.trim()) return res.status(400).json({ success: false, message: "Vui long nhap ma Captcha" });
  if (!_browser || !_page || _page.isClosed()) return res.status(400).json({ success: false, message: "Phien chua khoi dong. Bam 'Khoi dong phien TCT' truoc." });
  try {
    _sessionStatus = "logging_in";
    const username = ((reqUsername?.trim()) || process.env.GDT_MST || "0109120256").replace(/\s/g, "");
    const password = (reqPassword?.trim()) || process.env.GDT_PASSWORD || "Intra2026@";
    const cleanCaptcha = captcha.replace(/\s/g, "").toUpperCase();
    console.log("[GDT] Login MST=" + username + ", captcha=" + cleanCaptcha);
    const modalOpen = await _page.evaluate(() => {
      return Array.from(document.querySelectorAll(".ant-modal-content,.ant-modal")).some(m => m.offsetParent !== null && (m.querySelector('input[type="password"]') || m.innerText.includes("n \u0111\u0103ng nh\u1eadp")));
    });
    if (!modalOpen) {
      await _page.evaluate(() => { const btn = Array.from(document.querySelectorAll("*")).find(e => e.offsetParent !== null && e.innerText?.trim() === "\u0110\u0103ng nh\u1eadp" && !e.closest(".ant-modal")); if (btn) btn.click(); });
      await new Promise(r => setTimeout(r, 2000));
    }
    const loginRP = new Promise(resolve => {
      const handler = async resp => {
        const url = resp.url();
        if (url.includes("authenticate") || url.includes("/auth/login")) {
          _page.off("response", handler);
          try {
            const data = await resp.json();
            const token = data?.token || data?.jwt || data?.data?.token;
            if (token) { _gdtToken = token.startsWith("Bearer ") ? token : "Bearer " + token; _isLoggedIn = true; _sessionStatus = "logged_in"; SESSION.lastLoginTime = new Date(); console.log("[GDT] Token from /authenticate!"); }
            resolve(data);
          } catch (_) { resolve(null); }
        }
      };
      _page.on("response", handler);
      setTimeout(() => resolve(null), 8000);
    });
    const fillResult = await _page.evaluate((u, p, c) => {
      const modals = Array.from(document.querySelectorAll('.ant-modal-content,[role="dialog"],.ant-modal'));
      const modal = modals.find(m => m.offsetParent !== null && (m.querySelector('input[type="password"]') || m.innerText.includes("n \u0111\u0103ng nh\u1eadp")));
      if (!modal) return { ok: false, error: "No modal" };
      const inputs = Array.from(modal.querySelectorAll("input"));
      const setVal = (el, val) => {
        if (!el) return; el.focus();
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (s) s.call(el, val); else el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const uIn = inputs.find(i => i.name === "username" || i.id === "username") || inputs.find(i => i.type !== "password" && !i.placeholder?.toLowerCase().includes("captcha") && !i.placeholder?.toLowerCase().includes("m\u00e3")) || inputs[0];
      setVal(uIn, u);
      const pIn = inputs.find(i => i.type === "password" || i.name === "password") || inputs[1];
      setVal(pIn, p);
      const cIn = inputs.find(i => i.name === "captcha" || i.name === "cvalue" || i.placeholder?.toLowerCase().includes("captcha") || i.placeholder?.toLowerCase().includes("m\u00e3")) || inputs[2] || inputs[inputs.length - 1];
      setVal(cIn, c);
      const btn = modal.querySelector("button.ant-btn-primary,button[type='submit']") || Array.from(modal.querySelectorAll("button")).find(b => b.innerText?.toLowerCase().includes("\u0111\u0103ng nh\u1eadp"));
      if (btn && !btn.disabled) { btn.click(); return { ok: true, n: inputs.length }; }
      return { ok: false, error: "No submit btn", n: inputs.length };
    }, username, password, cleanCaptcha);
    console.log("[GDT] Fill:", JSON.stringify(fillResult));
    let loginOk = false, pageError = "";
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (_isLoggedIn) { loginOk = true; break; }
      const token = await extractGdtToken();
      if (token) { _gdtToken = token.startsWith("Bearer ") ? token : "Bearer " + token; _isLoggedIn = true; _sessionStatus = "logged_in"; SESSION.lastLoginTime = new Date(); loginOk = true; break; }
      const state = await _page.evaluate(() => {
        const errEl = document.querySelector(".ant-message-error span,.ant-form-item-explain-error,.ant-alert-error");
        const errorMsg = errEl?.innerText?.trim() || "";
        const header = document.querySelector("header,.home-header")?.innerText || "";
        const loggedIn = header.includes("\u0110\u0103ng xu\u1ea5t") || header.includes("0109120256");
        const modalGone = !Array.from(document.querySelectorAll(".ant-modal-content")).some(m => m.offsetParent !== null && (m.querySelector('input[type="password"]') || m.innerText.includes("n \u0111\u0103ng nh\u1eadp")));
        return { errorMsg, loggedIn, modalGone };
      });
      if (state.errorMsg) { pageError = state.errorMsg; break; }
      if (state.loggedIn || state.modalGone) {
        _isLoggedIn = true; _sessionStatus = "logged_in"; SESSION.lastLoginTime = new Date();
        const t = await extractGdtToken(); if (t) _gdtToken = t.startsWith("Bearer ") ? t : "Bearer " + t;
        loginOk = true; break;
      }
    }
    if (!loginOk) {
      _sessionStatus = "captcha_wait";
      let newImg = null;
      try { const b = await _page.screenshot({ encoding: "base64", fullPage: false }); if (b) newImg = "data:image/png;base64," + b; } catch (_) {}
      return res.status(400).json({ success: false, message: pageError || "Ma Captcha khong dung hoac da het han. Vui long thu lai.", captchaImage: newImg || SESSION.captchaImageBase64, captchaKey: "refresh_screenshot", sessionStatus: _sessionStatus });
    }
    _sessionStatus = "logged_in";
    console.log("[GDT] Dang nhap OK! Bat dau keo hoa don...");
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const startDate = req.query?.startDate || req.body?.startDate || ("01/" + mm + "/" + now.getFullYear());
      const endDate = req.query?.endDate || req.body?.endDate || (lastDay + "/" + mm + "/" + now.getFullYear());
      console.log("[GDT Auto-Scrape] " + startDate + " to " + endDate);
      const invoiceData = await scrapeViaGoto(startDate, endDate, 200);
      const list = invoiceData?.datas || invoiceData?.content || (Array.isArray(invoiceData) ? invoiceData : []);
      console.log("[GDT Auto-Scrape] " + list.length + " invoices...");
      const result = await saveInvoices(list);
      SESSION.invoiceCount = result.saved.length;

      // Kích hoạt tiến trình tải nền toàn bộ file XML về lưu MongoDB
      autoFetchXmls(result.saved, _gdtToken);

      return res.status(200).json({
        success: true,
        message: `Đăng nhập thành công! Đã kéo ${result.totalFetched} HĐ (Thêm mới: ${result.insertedCount}, Đã có sẵn: ${result.skippedCount}). Đang tự động lưu XML vào CSDL...`,
        sessionStatus: "logged_in",
        isLoggedIn: true,
        autoScrape: {
          count: result.saved.length,
          insertedCount: result.insertedCount,
          skippedCount: result.skippedCount,
          total: invoiceData?.total || list.length,
          startDate,
          endDate,
          data: result.saved
        }
      });
    } catch (se) {
      console.warn("[GDT] Auto-scrape error:", se.message);
      return res.status(200).json({ success: true, message: "Dang nhap thanh cong! (Keo hoa don that bai: " + se.message + ")", sessionStatus: "logged_in", isLoggedIn: true });
    }
  } catch (error) {
    _sessionStatus = "error"; SESSION.lastError = error.message;
    console.error("[GDT Login Error]:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGdtSessionStatus = async (req, res) => {
  return res.status(200).json({ success: true, isLoggedIn: _isLoggedIn, sessionStatus: _sessionStatus, hasBrowser: !!_browser && !_browser.disconnected, hasToken: !!_gdtToken, lastLoginTime: SESSION.lastLoginTime, invoiceCount: SESSION.invoiceCount, lastError: SESSION.lastError });
};

/**
 * Lấy trang Puppeteer hợp lệ đang hoạt động để chạy query bypass WAF
 */
export const getActiveGdtPage = async () => {
  if (_browser && !_browser.disconnected) {
    if (_page && !_page.isClosed()) {
      return _page;
    }
    const pages = await _browser.pages();
    if (pages.length > 0) {
      _page = pages[0];
      return _page;
    }
  }

  // Nếu browser chưa mở nhưng có token hoặc profile cache, tự khởi động headless browser
  try {
    const token = _gdtToken || loadTokenFromDisk();
    if (token) {
      const chromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ];
      const executablePath = chromePaths.find(p => fs.existsSync(p));
      console.log("[GDT] 🔄 Tự động mở browser nền để phục vụ tải XML/PDF/ZIP...");
      _browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        userDataDir: PROFILE_DIR,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"]
      });
      const pages = await _browser.pages();
      _page = pages.length > 0 ? pages[0] : await _browser.newPage();
      await _page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        window.chrome = { runtime: {} };
      });
      await _page.goto("https://hoadondientu.gdt.gov.vn/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      return _page;
    }
  } catch (err) {
    console.warn("[GDT] Không thể tự mở browser nền:", err.message);
  }

  return null;
};

// Tự động tải XML nền cho danh sách hóa đơn
const autoFetchXmls = (invoices, token, page = null) => {
  if (!Array.isArray(invoices) || invoices.length === 0) return;
  setTimeout(async () => {
    console.log(`[GDT Auto-XML] 🚀 Bắt đầu tự động tải XML cho ${invoices.length} hóa đơn...`);
    let downloaded = 0;
    const activePage = page || await getActiveGdtPage();
    for (const inv of invoices) {
      try {
        if (!inv.xml_raw_data || !inv.xml_raw_data.trim().startsWith("<")) {
          const doc = await GdtInvoice.findById(inv._id);
          if (doc && (!doc.xml_raw_data || !doc.xml_raw_data.trim().startsWith("<"))) {
            const xml = await fetchInvoiceXml(doc, token, activePage);
            if (xml && xml.trim().startsWith("<")) {
              downloaded++;
            }
            await new Promise(r => setTimeout(r, 400));
          }
        }
      } catch (err) {
        console.warn(`[GDT Auto-XML] Lỗi tải XML HĐ ${inv.shdon}:`, err.message);
      }
    }
    console.log(`[GDT Auto-XML] ✅ Hoàn tất! Đã lưu ${downloaded} file XML vào MongoDB.`);
  }, 500);
};

export const scrapeGdtInvoices = async (req, res) => {
  const { startDate = "01/09/2026", endDate = "30/09/2026", size = 100 } = req.query;
  if (!_browser || !_page || _page.isClosed() || !_isLoggedIn) return res.status(401).json({ success: false, message: "Chua dang nhap TCT. Bam 'Khoi dong phien TCT' va nhap Captcha truoc." });
  try {
    _sessionStatus = "scraping";
    if (!_gdtToken) { const t = await extractGdtToken(); if (t) _gdtToken = t.startsWith("Bearer ") ? t : "Bearer " + t; }
    console.log("[GDT Scrape] " + startDate + " to " + endDate);
    const invoiceData = await scrapeViaGoto(startDate, endDate, size);
    _sessionStatus = "logged_in";
    const list = invoiceData?.datas || invoiceData?.content || (Array.isArray(invoiceData) ? invoiceData : []);
    const result = await saveInvoices(list);
    SESSION.invoiceCount = result.saved.length;

    // Tự động tải XML nền qua chính tab browser vừa cào dữ liệu
    autoFetchXmls(result.saved, _gdtToken, _page);

    return res.status(200).json({
      success: true,
      message: `Đã kéo ${result.totalFetched} HĐ từ TCT: Thêm mới ${result.insertedCount}, Đã có sẵn (bỏ qua): ${result.skippedCount}`,
      count: result.saved.length,
      insertedCount: result.insertedCount,
      skippedCount: result.skippedCount,
      totalInGdt: invoiceData?.total || list.length,
      data: result.saved
    });
  } catch (error) {
    _sessionStatus = "logged_in";
    console.error("[GDT Scrape Error]:", error.message);
    if (error.message.includes("401") || error.message.includes("403")) { _isLoggedIn = false; return res.status(401).json({ success: false, message: "Phien TCT het han. Vui long dang nhap lai." }); }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const scrapeGdtInvoiceXml = async (req, res) => {
  const { id } = req.params;
  const token = _gdtToken || loadTokenFromDisk();
  const activePage = await getActiveGdtPage();

  if (!_isLoggedIn && !token && !activePage) {
    return res.status(401).json({ success: false, message: "Chưa đăng nhập TCT. Vui lòng khởi động phiên và nhập Captcha trước." });
  }
  try {
    const invoice = await GdtInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });

    const xml = await fetchInvoiceXml(invoice, token, activePage);
    if (!xml || !xml.trim().startsWith("<")) {
      return res.status(400).json({ success: false, message: "Không tải được XML từ TCT. Vui lòng kiểm tra lại phiên đăng nhập." });
    }

    return res.status(200).json({ success: true, message: "Đã lưu XML gốc!", invoice });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Tải file XML của 1 hóa đơn về máy
 */
export const downloadInvoiceXmlFile = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await GdtInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });

    let xml = invoice.xml_raw_data;
    const token = _gdtToken || loadTokenFromDisk();
    const activePage = await getActiveGdtPage();

    if ((!xml || !xml.trim().startsWith("<")) && (token || activePage)) {
      xml = await fetchInvoiceXml(invoice, token, activePage);
    }

    if (!xml || !xml.trim().startsWith("<")) {
      return res.status(400).json({
        success: false,
        message: "Chưa có dữ liệu XML của hóa đơn này. Vui lòng bấm 'Khởi động phiên TCT' để đăng nhập và tải XML từ Tổng Cục Thuế."
      });
    }

    const safeShdon = String(invoice.shdon || "").padStart(7, "0");
    const safeKhhdon = invoice.khhdon || "HD";
    const filename = `HD_${safeShdon}_${safeKhhdon}.xml`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(xml);
  } catch (error) {
    console.error("[Download XML Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xuất và tải file PDF bản thể hiện của 1 hóa đơn
 */
export const downloadInvoicePdfFile = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await GdtInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });

    const token = _gdtToken || loadTokenFromDisk();
    const activePage = await getActiveGdtPage();

    let detail = null;
    if (token || activePage) {
      detail = await fetchInvoiceDetail(invoice, token, activePage);
    }

    const company = await Company.findOne({ deletedAt: null }).lean();
    const html = generateInvoiceHtml(invoice, detail, company);
    const pdfBuffer = await renderPdfFromHtml(html, _browser);

    const safeShdon = String(invoice.shdon || "").padStart(7, "0");
    const safeKhhdon = invoice.khhdon || "HD";
    const filename = `HD_${safeShdon}_${safeKhhdon}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[Download PDF Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Tải toàn bộ hoặc các hóa đơn đã chọn thành 1 file ZIP (gồm cả XML và PDF)
 */
export const downloadInvoicesZipFile = async (req, res) => {
  try {
    const { ids } = req.body || {};
    let query = {};
    if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    }
    const invoices = await GdtInvoice.find(query).sort({ tdlap: -1 });
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: "Không có hóa đơn nào để xuất file" });
    }

    const token = _gdtToken || loadTokenFromDisk();
    const activePage = await getActiveGdtPage();

    console.log(`[GDT ZIP] Đang xuất file ZIP cho ${invoices.length} hóa đơn...`);
    await streamInvoicesZip(invoices, token, _browser, res, activePage);
  } catch (error) {
    console.error("[Download ZIP Error]:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

export const closeGdtSession = async (req, res) => {
  await closeBrowserInternal();
  return res.status(200).json({ success: true, message: "Da dong phien TCT." });
};
