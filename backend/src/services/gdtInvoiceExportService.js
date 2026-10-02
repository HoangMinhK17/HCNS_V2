import { randomUUID } from "crypto";
import JSZip from "jszip";
import puppeteer from "puppeteer";
import GdtInvoice from "../models/GdtInvoice.js";
import Company from "../models/Company.js";

/**
 * Đọc số tiền thành chữ Tiếng Việt chuẩn
 */
export function readVietnameseNumber(num) {
  if (!num || isNaN(num) || num === 0) return "Không đồng";
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readGroup(group, showZeroHundred) {
    let c = Math.floor(group / 100);
    let b = Math.floor((group % 100) / 10);
    let a = group % 10;
    let res = "";
    if (c > 0 || showZeroHundred) {
      res += digits[c] + " trăm ";
    }
    if (b > 1) {
      res += digits[b] + " mươi ";
      if (a === 1) res += "mốt ";
      else if (a === 4) res += "tư ";
      else if (a === 5) res += "lăm ";
      else if (a > 0) res += digits[a] + " ";
    } else if (b === 1) {
      res += "mười ";
      if (a === 5) res += "lăm ";
      else if (a > 0) res += digits[a] + " ";
    } else if (b === 0 && (c > 0 || showZeroHundred) && a > 0) {
      res += "lẻ " + digits[a] + " ";
    } else if (a > 0) {
      res += digits[a] + " ";
    }
    return res.trim();
  }

  let n = Math.abs(Math.round(num));
  let groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  let words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    let grp = groups[i];
    if (grp > 0) {
      let grpStr = readGroup(grp, i < groups.length - 1);
      words.push(grpStr + " " + units[i]);
    }
  }

  let result = words.join(" ").trim().replace(/\s+/g, " ") + " đồng";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Định dạng tiền tệ VND
 */
export function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("vi-VN");
}

/**
 * Định dạng ngày dd/mm/yyyy
 */
export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày giờ chuẩn YYYY-MM-DD HH:mm:ss cho chữ ký số
 */
export function formatDateTime(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Headers chuẩn WAF GDT
 */
const buildGdtHeaders = (token, action = "Xem chi tiết (hóa đơn)") => ({
  "Authorization": token?.startsWith("Bearer ") ? token : `Bearer ${token || ""}`,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "vi",
  "Action": encodeURIComponent(action),
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
 * Helper giải nén hoặc parse XML từ dữ liệu phản hồi của GDT (hỗ trợ cả file ZIP và text XML)
 */
async function parseXmlFromBuffer(buffer) {
  if (!buffer || buffer.length === 0) return "";
  
  // 1. Nếu là dạng ZIP archive (bắt đầu bằng magic bytes PK\x03\x04)
  if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      // Ưu tiên tìm file invoice.xml hoặc bất kỳ file .xml nào trong ZIP
      const fileNames = Object.keys(zip.files);
      const xmlFileKey = fileNames.find(f => f.toLowerCase() === "invoice.xml") || fileNames.find(f => f.toLowerCase().endsWith(".xml"));
      if (xmlFileKey) {
        const xmlContent = await zip.files[xmlFileKey].async("string");
        if (xmlContent && xmlContent.trim().startsWith("<")) {
          return xmlContent;
        }
      }
    } catch (err) {
      console.warn("[GDT Service] Lỗi giải nén ZIP XML:", err.message);
    }
  }

  // 2. Nếu là text XML trực tiếp
  const text = buffer.toString("utf-8");
  if (text && text.trim().startsWith("<")) {
    return text;
  }

  return "";
}

/**
 * Tải file XML từ GDT API
 */
export async function fetchInvoiceXml(invoice, token, page = null) {
  if (invoice.xml_raw_data && invoice.xml_raw_data.trim().startsWith("<")) {
    return invoice.xml_raw_data;
  }

  const shdonRaw = String(invoice.shdon || "").trim();
  const shdonNum = Number(shdonRaw) || shdonRaw;
  const khmshdon = invoice.khmshdon || "1";

  // Thử các biến thể shdon (dạng số 8863 và dạng có số 0 đệm 0008863)
  const candidateShdon = Array.from(new Set([shdonNum, shdonRaw, String(shdonNum).padStart(7, "0")]));

  // Cách 1: Chạy qua Puppeteer page.evaluate() (Bypass WAF 100% bằng real session browser context)
  if (page && !page.isClosed()) {
    for (const sh of candidateShdon) {
      const xmlUrl = `https://hoadondientu.gdt.gov.vn/api/query/invoices/export-xml?nbmst=${encodeURIComponent(invoice.nbmst)}&khhdon=${encodeURIComponent(invoice.khhdon)}&shdon=${encodeURIComponent(sh)}&khmshdon=${encodeURIComponent(khmshdon)}`;
      try {
        console.log("[GDT Service] 🔄 Fetching XML via Puppeteer page:", xmlUrl);
        const b64Data = await page.evaluate(async (url, tok) => {
          let finalAuth = tok ? (tok.startsWith("Bearer ") ? tok : `Bearer ${tok}`) : "";
          if (!finalAuth) {
            for (let i = 0; i < localStorage.length; i++) {
              const v = localStorage.getItem(localStorage.key(i));
              if (typeof v === "string" && v.includes("eyJ")) {
                const m = v.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
                if (m) { finalAuth = "Bearer " + m[0]; break; }
              }
            }
          }

          const actions = [
            "Xuất hóa đơn điện tử",
            "Xem chi tiết (hóa đơn)",
            "Xem chi tiết hóa đơn",
            "Tìm kiếm (hóa đơn mua vào)"
          ];

          for (const actionName of actions) {
            try {
              const resp = await fetch(url, {
                method: "GET",
                headers: {
                  "Authorization": finalAuth,
                  "Accept": "*/*",
                  "Action": encodeURIComponent(actionName),
                  "End-Point": "/tra-cuu/tra-cuu-hoa-don",
                  "Referer": "https://hoadondientu.gdt.gov.vn/tra-cuu/tra-cuu-hoa-don",
                  "request-id": "req-" + Math.random().toString(36).substring(2)
                }
              });

              if (resp.ok) {
                const ab = await resp.arrayBuffer();
                const bytes = new Uint8Array(ab);
                let binary = "";
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                return window.btoa(binary);
              }
            } catch (_) {}
          }
          return null;
        }, xmlUrl, token || "");

        if (b64Data && b64Data.length > 50) {
          const buf = Buffer.from(b64Data, "base64");
          const xmlContent = await parseXmlFromBuffer(buf);
          if (xmlContent && xmlContent.trim().startsWith("<")) {
            invoice.xml_raw_data = xmlContent;
            await invoice.save();
            console.log(`[GDT Service] ✅ Puppeteer đã giải nén và lưu XML hóa đơn ${invoice.shdon} (${xmlContent.length} bytes)!`);
            return xmlContent;
          }
        }
      } catch (err) {
        console.warn("[GDT Service] Puppeteer fetch XML error:", err.message);
      }
    }
  }

  // Cách 2: Node.js fetch fallback (nếu có token)
  if (token) {
    for (const sh of candidateShdon) {
      const xmlUrl = `https://hoadondientu.gdt.gov.vn/api/query/invoices/export-xml?nbmst=${encodeURIComponent(invoice.nbmst)}&khhdon=${encodeURIComponent(invoice.khhdon)}&shdon=${encodeURIComponent(sh)}&khmshdon=${encodeURIComponent(khmshdon)}`;
      try {
        console.log("[GDT Service] Fetching XML via Node.js fallback:", xmlUrl);
        const headers = buildGdtHeaders(token, "Xuất hóa đơn điện tử");
        headers["Accept"] = "*/*";

        let resp = await fetch(xmlUrl, { method: "GET", headers });
        if (!resp.ok) {
          const retryHeaders = buildGdtHeaders(token, "Xem chi tiết (hóa đơn)");
          retryHeaders["Accept"] = "*/*";
          resp = await fetch(xmlUrl, { method: "GET", headers: retryHeaders });
        }

        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const buf = Buffer.from(arrayBuffer);
          const xmlContent = await parseXmlFromBuffer(buf);
          if (xmlContent && xmlContent.trim().startsWith("<")) {
            invoice.xml_raw_data = xmlContent;
            await invoice.save();
            console.log(`[GDT Service] ✅ Node.js đã giải nén và lưu XML hóa đơn ${invoice.shdon} (${xmlContent.length} bytes)!`);
            return xmlContent;
          }
        }
      } catch (err) {
        console.warn("[GDT Service] Node.js fetch XML error:", err.message);
      }
    }
  }

  return invoice.xml_raw_data || "";
}

/**
 * Lấy chi tiết JSON của hóa đơn từ GDT API (gồm danh sách hàng hóa items)
 */
export async function fetchInvoiceDetail(invoice, token, page = null) {
  const shdonRaw = String(invoice.shdon || "").trim();
  const shdonNum = Number(shdonRaw) || shdonRaw;
  const khmshdon = invoice.khmshdon || "1";
  const candidateShdon = Array.from(new Set([shdonNum, shdonRaw, String(shdonNum).padStart(7, "0")]));

  // Cách 1: Puppeteer page.evaluate()
  if (page && !page.isClosed()) {
    for (const sh of candidateShdon) {
      const detailUrl = `https://hoadondientu.gdt.gov.vn/api/query/invoices/detail?nbmst=${encodeURIComponent(invoice.nbmst)}&khhdon=${encodeURIComponent(invoice.khhdon)}&shdon=${encodeURIComponent(sh)}&khmshdon=${encodeURIComponent(khmshdon)}`;
      try {
        const data = await page.evaluate(async (url, tok) => {
          let finalAuth = tok ? (tok.startsWith("Bearer ") ? tok : `Bearer ${tok}`) : "";
          if (!finalAuth) {
            for (let i = 0; i < localStorage.length; i++) {
              const v = localStorage.getItem(localStorage.key(i));
              if (typeof v === "string" && v.includes("eyJ")) {
                const m = v.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
                if (m) { finalAuth = "Bearer " + m[0]; break; }
              }
            }
          }

          const resp = await fetch(url, {
            method: "GET",
            headers: {
              "Authorization": finalAuth,
              "Accept": "application/json, text/plain, */*",
              "Action": encodeURIComponent("Xem chi tiết (hóa đơn)"),
              "Referer": "https://hoadondientu.gdt.gov.vn/tra-cuu/tra-cuu-hoa-don"
            }
          });
          if (resp.ok) {
            return await resp.json();
          }
          return null;
        }, detailUrl, token || "");

        if (data && (data.hdhdon || data.item || data.thhdhdon || data.nbmst)) {
          return data;
        }
      } catch (_) {}
    }
  }

  // Cách 2: Node.js fetch fallback
  if (token) {
    for (const sh of candidateShdon) {
      const detailUrl = `https://hoadondientu.gdt.gov.vn/api/query/invoices/detail?nbmst=${encodeURIComponent(invoice.nbmst)}&khhdon=${encodeURIComponent(invoice.khhdon)}&shdon=${encodeURIComponent(sh)}&khmshdon=${encodeURIComponent(khmshdon)}`;
      try {
        console.log("[GDT Service] Fetching Detail via Node.js:", detailUrl);
        const resp = await fetch(detailUrl, {
          method: "GET",
          headers: buildGdtHeaders(token, "Xem chi tiết (hóa đơn)")
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json && (json.hdhdon || json.item || json.thhdhdon || json.nbmst)) {
            return json;
          }
        }
      } catch (err) {
        console.warn("[GDT Service] Fetch Detail error:", err.message);
      }
    }
  }
  return null;
}

/**
 * Bóc tách dữ liệu có cấu trúc từ file XML gốc (Nghị định 123 / Thông tư 78)
 */
export function parseXmlInvoiceData(xmlStr) {
  if (!xmlStr || typeof xmlStr !== "string" || !xmlStr.trim().startsWith("<")) {
    return null;
  }

  const getTag = (xml, tag) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };

  const getSection = (xml, tag) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return m ? m[1] : "";
  };

  try {
    const ttChung = getSection(xmlStr, "TTChung");
    const nBan = getSection(xmlStr, "NBan");
    const nMua = getSection(xmlStr, "NMua");
    const dshhdvu = getSection(xmlStr, "DSHHDVu");
    const tToan = getSection(xmlStr, "TToan");
    const mccqt = getTag(xmlStr, "MCCQT");
    const signingTime = getTag(xmlStr, "SigningTime");

    // Bóc tách danh sách hàng hóa
    const items = [];
    const itemMatches = dshhdvu.match(/<HHDVu[\s\S]*?<\/HHDVu>/gi) || [];
    for (const itXml of itemMatches) {
      items.push({
        thhdvu: getTag(itXml, "THHDVu") || getTag(itXml, "Ten") || "",
        dvtinh: getTag(itXml, "DVTinh") || getTag(itXml, "DVT") || "",
        sluong: Number(getTag(itXml, "SLuong")) || 0,
        dgia: Number(getTag(itXml, "DGia")) || 0,
        thtien: Number(getTag(itXml, "ThTien")) || 0,
        tsuat: getTag(itXml, "TSuat") || "",
      });
    }

    return {
      khmshdon: getTag(ttChung, "KHMSHDon") || "1",
      khhdon: getTag(ttChung, "KHHDon"),
      shdon: getTag(ttChung, "SHDon"),
      nlap: getTag(ttChung, "NLap"),
      htttoan: getTag(ttChung, "HTTToan") || "TM/CK",
      mccqt,
      signingTime,
      // Bên Bán
      nbten: getTag(nBan, "Ten"),
      nbmst: getTag(nBan, "MST"),
      nbdchi: getTag(nBan, "DChi"),
      nbsdthoai: getTag(nBan, "SDThoai"),
      // Bên Mua
      nmten: getTag(nMua, "Ten"),
      nmmst: getTag(nMua, "MST"),
      nmdchi: getTag(nMua, "DChi"),
      // Tiền
      tgtttbso: Number(getTag(tToan, "TgTCThue")) || Number(getTag(tToan, "ThTien")) || 0,
      tgtthue: Number(getTag(tToan, "TgTThue")) || Number(getTag(tToan, "TThue")) || 0,
      tgttoan: Number(getTag(tToan, "TgTTTBSo")) || Number(getTag(tToan, "TongTien")) || 0,
      amountInWords: getTag(tToan, "TgTTTBChu"),
      items,
    };
  } catch (err) {
    console.warn("[XML Parse Error]:", err.message);
    return null;
  }
}

/**
 * Sinh HTML bản thể hiện Hóa đơn điện tử chuẩn Bộ Tài Chính (TT78)
 */
export function generateInvoiceHtml(invoice, detailData = null, company = null) {
  // ƯU TIÊN SỐ 1: Bóc tách trực tiếp từ chuỗi XML gốc lưu trong DB nếu có
  const xmlParsed = invoice.xml_raw_data ? parseXmlInvoiceData(invoice.xml_raw_data) : null;
  const d = xmlParsed || detailData || {};

  const sellerName = d.nbten || invoice.nbten || "";
  const sellerTax = d.nbmst || invoice.nbmst || "";
  const sellerAddress = d.nbdchi || invoice.nbdchi || "";
  const sellerTel = d.nbsdthoai || "";

  // Thông tin Đơn vị Mua hàng: Ưu tiên dữ liệu hóa đơn gốc từ XML/TCT -> sau đó đến Công ty trong CSDL
  const buyerName = d.nmten || company?.name || "CÔNG TY TNHH FUMEE TECH";
  const buyerTax = d.nmmst || company?.taxCode || "0109120256";
  const buyerAddress = d.nmdchi || company?.address || "Tầng 3, Số 23 Tô Vĩnh Diện, Phường Khương Trung, Quận Thanh Xuân, Thành phố Hà Nội, Việt Nam";
  const buyerPayment = d.htttoan || "TM/CK";

  const issueDate = d.nlap ? new Date(d.nlap) : (invoice.tdlap ? new Date(invoice.tdlap) : new Date());
  const day = String(issueDate.getDate()).padStart(2, "0");
  const month = String(issueDate.getMonth() + 1).padStart(2, "0");
  const year = issueDate.getFullYear();

  const totalBeforeTax = Number(d.tgtttbso ?? invoice.tgtttbso ?? 0);
  const totalTax = Number(d.tgtthue ?? invoice.tgtthue ?? 0);
  const totalPayment = Number(d.tgttoan ?? invoice.tgttoan ?? (totalBeforeTax + totalTax));
  const amountInWords = d.amountInWords || readVietnameseNumber(totalPayment);

  // Chữ ký số: Ưu tiên signingTime từ XML -> nếu không có thì lấy tdlap
  const signDate = d.signingTime ? new Date(d.signingTime) : (invoice.tdlap ? new Date(invoice.tdlap) : new Date());

  // Danh sách hàng hóa
  const items = d.thhdon || d.items || invoice.items || [];
  let itemRowsHtml = "";

  if (Array.isArray(items) && items.length > 0) {
    itemRowsHtml = items.map((it, idx) => {
      const name = it.thhdvu || it.item_name || "Hàng hóa / Dịch vụ";
      const unit = it.dvtinh || it.unit || "";
      const qty = it.sluong || it.quantity ? Number(it.sluong || it.quantity).toLocaleString("vi-VN") : "";
      const price = it.dgia || it.unit_price ? Number(it.dgia || it.unit_price).toLocaleString("vi-VN") : "";
      const amount = it.thtien || it.amount ? Number(it.thtien || it.amount).toLocaleString("vi-VN") : "";
      const taxRate = it.tsuat !== undefined ? `${it.tsuat}%` : (it.tax_rate !== undefined ? `${it.tax_rate}%` : "");

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${name}</td>
          <td style="text-align: center;">${unit}</td>
          <td style="text-align: right;">${qty}</td>
          <td style="text-align: right;">${price}</td>
          <td style="text-align: right;">${amount}</td>
          <td style="text-align: center;">${taxRate}</td>
        </tr>
      `;
    }).join("");
  } else {
    itemRowsHtml = `
      <tr>
        <td style="text-align: center;">1</td>
        <td>Cung cấp hàng hóa / dịch vụ theo hóa đơn số ${invoice.shdon}</td>
        <td style="text-align: center;">Gói</td>
        <td style="text-align: right;">1</td>
        <td style="text-align: right;">${formatCurrency(totalBeforeTax)}</td>
        <td style="text-align: right;">${formatCurrency(totalBeforeTax)}</td>
        <td style="text-align: center;">${totalTax > 0 ? (Math.round((totalTax / (totalBeforeTax || 1)) * 100) + "%") : "0%"}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hóa Đơn Điện Tử - ${invoice.shdon}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif, "Segoe UI", Arial;
      color: #111;
      line-height: 1.4;
      margin: 0;
      padding: 10px;
      font-size: 13.5px;
      background: #fff;
    }
    .invoice-container {
      border: 2px solid #1a365d;
      border-radius: 4px;
      padding: 18px 22px;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: top;
    }
    .title-area {
      text-align: center;
      margin: 8px 0 14px;
    }
    .title-area h1 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #b91c1c;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .title-area .sub-title {
      font-size: 13px;
      color: #334155;
      font-style: italic;
    }
    .info-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      margin-bottom: 4px;
    }
    .info-label {
      width: 150px;
      font-weight: 600;
      color: #1e293b;
      flex-shrink: 0;
    }
    .info-value {
      flex: 1;
      color: #0f172a;
    }
    .badge-label {
      display: inline-block;
      padding: 2px 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      font-weight: bold;
      color: #1d4ed8;
      font-size: 12px;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 10px;
    }
    .item-table th, .item-table td {
      border: 1px solid #475569;
      padding: 6px 8px;
    }
    .item-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
      text-align: center;
      font-size: 13px;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .totals-table td {
      padding: 4px 8px;
    }
    .amount-words {
      margin-top: 8px;
      padding: 6px 10px;
      background: #f8fafc;
      border-left: 3px solid #b91c1c;
      font-style: italic;
    }
    .sign-table {
      width: 100%;
      margin-top: 24px;
      border-collapse: collapse;
    }
    .sign-table td {
      width: 50%;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
      color: #1e293b;
    }
    .sign-sub {
      font-size: 11.5px;
      font-style: italic;
      color: #64748b;
    }
    .digital-stamp {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 14px 10px;
      border: 1.5px solid #009900;
      border-radius: 0px;
      background: #fff;
      color: #009900;
      font-size: 11.5px;
      text-align: left;
      position: relative;
      min-width: 250px;
      max-width: 300px;
      box-sizing: border-box;
      line-height: 1.4;
    }
    .digital-stamp .stamp-title {
      color: #009900;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 3px;
      letter-spacing: 0.2px;
    }
    .digital-stamp .stamp-body {
      padding-right: 32px;
    }
    .digital-stamp .stamp-signer {
      color: #009900;
      font-size: 11.5px;
      line-height: 1.35;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .digital-stamp .stamp-date {
      color: #009900;
      font-size: 11px;
    }
    .digital-stamp .stamp-check {
      position: absolute;
      right: 12px;
      bottom: 10px;
      width: 34px;
      height: 34px;
    }
    .watermark {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 55px;
      font-weight: bold;
      color: rgba(26, 54, 93, 0.04);
      pointer-events: none;
      white-space: nowrap;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="watermark">HÓA ĐƠN ĐIỆN TỬ</div>

    <!-- Header & Metadata -->
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <div style="font-size: 16px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">
            ${sellerName}
          </div>
          <div style="margin-top: 4px; font-size: 12.5px;">
            <b>Mã số thuế:</b> <span class="badge-label">${sellerTax}</span>
          </div>
          <div style="margin-top: 2px; font-size: 12.5px;">
            <b>Địa chỉ:</b> ${sellerAddress}
          </div>
          ${sellerTel ? `<div style="font-size: 12px;"><b>Điện thoại:</b> ${sellerTel}</div>` : ""}
        </td>
        <td style="width: 40%; text-align: right;">
          <div style="font-size: 12px; line-height: 1.6;">
            <div><b>Mẫu số (Form):</b> <span style="color: #b91c1c; font-weight: bold;">${invoice.khmshdon || "1"}</span></div>
            <div><b>Ký hiệu (Serial):</b> <span style="color: #b91c1c; font-weight: bold;">${invoice.khhdon || ""}</span></div>
            <div><b>Số (Invoice No.):</b> <span style="color: #b91c1c; font-size: 15px; font-weight: bold;">${invoice.shdon || ""}</span></div>
            <div><b>Ngày lập:</b> ${formatDate(invoice.tdlap)}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <div class="title-area">
      <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
      <div class="sub-title">
        (Bản thể hiện của hóa đơn điện tử - Tra cứu dữ liệu gốc từ Tổng Cục Thuế)
      </div>
      <div style="font-size: 13px; margin-top: 2px;">
        Ngày <b>${day}</b> tháng <b>${month}</b> năm <b>${year}</b>
      </div>
      ${d.mccqt ? `<div style="font-size: 12px; margin-top: 4px; color: #334155; font-family: monospace;"><b>MCCQT:</b> ${d.mccqt}</div>` : ""}
    </div>

    <!-- Buyer Info -->
    <div class="info-section">
      <div class="info-row">
        <div class="info-label">Đơn vị mua hàng:</div>
        <div class="info-value" style="font-weight: bold; text-transform: uppercase; color: #1e3a8a;">
          ${buyerName}
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Mã số thuế:</div>
        <div class="info-value"><span class="badge-label">${buyerTax}</span></div>
      </div>
      <div class="info-row">
        <div class="info-label">Địa chỉ:</div>
        <div class="info-value">${buyerAddress}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Hình thức thanh toán:</div>
        <div class="info-value">${buyerPayment} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Đồng tiền:</b> VND</div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="item-table">
      <thead>
        <tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 45%;">Tên hàng hóa, dịch vụ</th>
          <th style="width: 8%;">ĐVT</th>
          <th style="width: 10%;">Số lượng</th>
          <th style="width: 14%;">Đơn giá</th>
          <th style="width: 18%;">Thành tiền</th>
          <th style="width: 8%;">Thuế suất</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <table class="totals-table">
      <tr>
        <td style="text-align: right; width: 70%; font-weight: 600;">Cộng tiền hàng (chưa thuế):</td>
        <td style="text-align: right; width: 30%; font-weight: bold;">${formatCurrency(totalBeforeTax)} VND</td>
      </tr>
      <tr>
        <td style="text-align: right; font-weight: 600;">Tiền thuế giá trị gia tăng (VAT):</td>
        <td style="text-align: right; font-weight: bold; color: #b91c1c;">${formatCurrency(totalTax)} VND</td>
      </tr>
      <tr style="font-size: 14.5px; border-top: 1.5px solid #1e293b;">
        <td style="text-align: right; font-weight: bold; text-transform: uppercase; color: #1e3a8a; padding-top: 6px;">
          Tổng cộng tiền thanh toán:
        </td>
        <td style="text-align: right; font-weight: bold; color: #b91c1c; font-size: 16px; padding-top: 6px;">
          ${formatCurrency(totalPayment)} VND
        </td>
      </tr>
    </table>

    <!-- Amount in words -->
    <div class="amount-words">
      <b>Số tiền viết bằng chữ:</b> ${amountInWords}
    </div>

    <!-- Signatures -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-title">NGƯỜI MUA HÀNG</div>
          <div class="sign-sub">(Chữ ký số (nếu có))</div>
        </td>
        <td>
          <div class="sign-title">NGƯỜI BÁN HÀNG</div>
          <div class="sign-sub">(Chữ ký điện tử, chữ ký số)</div>
          <div class="digital-stamp">
            <div class="stamp-title">Signature Valid</div>
            <div class="stamp-body">
              <div class="stamp-signer">Ký bởi ${sellerName.toUpperCase()}</div>
              <div class="stamp-date">Ký ngày: ${formatDateTime(signDate)}</div>
            </div>
            <svg class="stamp-check" viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5L9 17.5L20 6.5" stroke="#009900" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-top: 14px; text-align: center; font-size: 11px; font-style: italic; color: #64748b;">
      (Cần kiểm tra, đối chiếu khi lập, nhận hóa đơn)
    </div>

    <div style="margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
      Hóa đơn điện tử được khởi tạo và lưu trữ trên hệ thống Tổng Cục Thuế & ERP FUMEE TECH.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Xuất file PDF từ mã HTML bằng Puppeteer
 */
export async function renderPdfFromHtml(html, existingBrowser = null) {
  let browser = existingBrowser;
  let needClose = false;

  if (!browser || browser.disconnected) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    needClose = true;
  }

  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
    });
    return pdfBuffer;
  } finally {
    await page.close();
    if (needClose) await browser.close();
  }
}

/**
 * Đóng gói toàn bộ hóa đơn thành file ZIP (gồm thư mục XML và PDF)
 */
export async function streamInvoicesZip(invoices, token, browser, res, page = null) {
  const zip = new JSZip();
  const company = await Company.findOne({ deletedAt: null }).lean();

  const xmlFolder = zip.folder("XML");
  const pdfFolder = zip.folder("PDF");

  for (const inv of invoices) {
    try {
      const safeShdon = String(inv.shdon || "").padStart(7, "0");
      const safeKhhdon = inv.khhdon || "HD";
      const safeMst = inv.nbmst || "MST";
      const baseName = `HD_${safeShdon}_${safeKhhdon}_${safeMst}`;

      // 1. Lấy XML (ưu tiên qua browser session)
      const xml = await fetchInvoiceXml(inv, token, page);
      if (xml && xml.trim().startsWith("<")) {
        xmlFolder.file(`${baseName}.xml`, xml);
      }

      // 2. Lấy chi tiết & sinh PDF
      let detail = null;
      if (token || page) {
        detail = await fetchInvoiceDetail(inv, token, page);
      }
      const html = generateInvoiceHtml(inv, detail, company);
      const pdfBuffer = await renderPdfFromHtml(html, browser);
      pdfFolder.file(`${baseName}.pdf`, pdfBuffer);

    } catch (err) {
      console.warn(`[GDT ZIP] Lỗi xuất hóa đơn ${inv.shdon}:`, err.message);
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const fileName = `HoaDon_FumeeTech_${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.status(200).send(zipBuffer);
}
