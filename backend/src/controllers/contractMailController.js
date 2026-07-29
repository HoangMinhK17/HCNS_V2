import { sendMail } from "../config/sendMail.js";
import Employee from "../models/Employee.js";
import PizZip from "pizzip";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const sendContractWarning = async (req, res) => {
  const { employeeId, name, email, contractType, expiry, daysLeft, position, dept } = req.body;
  if (!email || !name) {
    return res.status(400).json({ success: false, message: "Thieu thong tin email hoac ten nhan vien." });
  }
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8" /><title>Thong bao hop dong sap het han</title></head><body><p>Kinh gui <strong>${name}</strong>, hop dong cua ban se het han vao ngay <strong>${expiry}</strong> (con <strong>${daysLeft}</strong> ngay). Lien he phong nhan su de xu ly gia han.</p></body></html>`;
  try {
    await sendMail({ to: email, subject: `[HCNS] Hop dong sap het han`, html });
    return res.status(200).json({ success: true, message: `Da gui thong bao den ${name} (${email}).` });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gui mail that bai.", error: error.message });
  }
};

export const renewContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractType, startDate, endDate, salary, positionId, positionName, departmentId, departmentName, notes } = req.body;
    if (!contractType || !startDate) {
      return res.status(400).json({ success: false, message: "Thieu loai hop dong hoac ngay bat dau." });
    }
    const updateData = { contractType, startDate: new Date(startDate), note: notes || "" };
    if (endDate) updateData.endDateOfContract = new Date(endDate);
    if (salary !== undefined && salary !== null && salary !== "") updateData.salary = Number(salary);
    if (positionId) updateData.position = positionId;
    if (positionName) updateData.positionName = positionName;
    if (departmentId) updateData.department = departmentId;
    if (departmentName) updateData.departmentName = departmentName;
    const updated = await Employee.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate("position", "name").populate("department", "name");
    if (!updated) return res.status(404).json({ success: false, message: "Khong tim thay nhan vien." });
    return res.status(200).json({ success: true, message: "Gia han hop dong thanh cong.", employee: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const renewAndGenerate = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractType, startDate, endDate, salary, positionId, positionName, departmentId, departmentName, notes } = req.body;
    const templateFile = req.files?.template?.[0];
    const cccdFront = req.files?.cccdFront?.[0];
    const cccdBack = req.files?.cccdBack?.[0];
    if (!templateFile) {
      return res.status(400).json({ success: false, message: "Thieu file Hop dong (.docx)" });
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // BUOC 1: OCR anh CCCD
    let cccdNumber = "", dob = "", placeOfOrigin = "", address = "", issueDate = "", cccdName = "";
    if (cccdFront || cccdBack) {
      try {
        console.log("[Gemini OCR] Dang doc anh CCCD...");
        const targetImage = cccdFront || cccdBack;
        const ocrPrompt = `Day la anh Can cuoc cong dan Viet Nam. Hay doc va tra ve JSON thuan tuy (khong markdown, khong backtick):
{"cccd_number":"","full_name":"","dob":"","gender":"","nationality":"","place_of_origin":"","address":"","issue_date":""}
Neu khong doc duoc truong nao, de rong "".`;
        const imagePart = { inlineData: { data: targetImage.buffer.toString("base64"), mimeType: targetImage.mimetype } };
        const ocrResult = await model.generateContent([ocrPrompt, imagePart]);
        const ocrRaw = ocrResult.response.text().trim().replace(/```json|```/g, "").trim();
        const ocrData = JSON.parse(ocrRaw);
        cccdNumber = ocrData.cccd_number || "";
        cccdName = ocrData.full_name || "";
        dob = ocrData.dob || "";
        placeOfOrigin = ocrData.place_of_origin || "";
        address = ocrData.address || "";
        issueDate = ocrData.issue_date || "";
        console.log(`[Gemini OCR] OK: ${cccdName} - CCCD: ${cccdNumber}`);
      } catch (ocrErr) {
        console.error("[Gemini OCR] Loi:", ocrErr.message);
      }
    }

    // BUOC 2: Cap nhat DB
    const updateData = { contractType, startDate: new Date(startDate), note: notes || "" };
    if (endDate && endDate !== "null" && endDate !== "undefined") updateData.endDateOfContract = new Date(endDate);
    if (salary !== undefined && salary !== null && salary !== "") updateData.salary = Number(salary);
    if (positionId) updateData.position = positionId;
    if (positionName) updateData.positionName = positionName;
    if (departmentId) updateData.department = departmentId;
    if (departmentName) updateData.departmentName = departmentName;
    const updatedEmp = await Employee.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate("position", "name").populate("department", "name");
    if (!updatedEmp) return res.status(404).json({ success: false, message: "Khong tim thay nhan vien." });

    // BUOC 3: Trich xuat van ban tu file Word
    console.log("[ContractGenerate] Trich xuat noi dung file Word...");
    const mammoth = (await import("mammoth")).default;
    const { value: contractPlainText } = await mammoth.extractRawText({ buffer: templateFile.buffer });
    const CONTRACT_TYPE_LABEL = {
      probation: "Hop dong Thu viec",
      "fixed-term": "Hop dong Xac dinh thoi han",
      indefinite: "Hop dong Khong xac dinh thoi han",
    };
    const employeeInfo = [
      `- Ho va ten nguoi lao dong: ${updatedEmp.fullName}`,
      `- Ma nhan vien: ${updatedEmp.empCode}`,
      `- Chuc danh / Vi tri: ${updatedEmp.positionName || updatedEmp.position?.name || ""}`,
      `- Phong ban: ${updatedEmp.departmentName || updatedEmp.department?.name || ""}`,
      `- Muc luong co ban: ${updatedEmp.salary ? Number(updatedEmp.salary).toLocaleString("vi-VN") : ""} VND/thang`,
      `- Loai hop dong: ${CONTRACT_TYPE_LABEL[contractType] || contractType}`,
      `- Ngay bat dau hop dong: ${startDate ? new Date(startDate).toLocaleDateString("vi-VN") : ""}`,
      `- Ngay ket thuc hop dong: ${endDate && endDate !== "null" && endDate !== "undefined" ? new Date(endDate).toLocaleDateString("vi-VN") : "Khong xac dinh"}`,
      cccdNumber ? `- So CCCD/CMND: ${cccdNumber}` : "",
      dob ? `- Ngay sinh: ${dob}` : "",
      cccdName ? `- Ten tren CCCD: ${cccdName}` : "",
      placeOfOrigin ? `- Que quan / Nguyen quan: ${placeOfOrigin}` : "",
      address ? `- Noi dang ky ho khau thuong tru: ${address}` : "",
      issueDate ? `- Ngay cap CCCD: ${issueDate}` : "",
    ].filter(Boolean).join("\n");

    // BUOC 4: Gemini dien thong tin vao hop dong
    console.log("[ContractGenerate] Dang nho Gemini dien thong tin...");

    // Gioi han token: cat bot neu qua dai (khoang 6000 ky tu ~ 1500 tokens)
    const MAX_CHARS = 6000;
    const truncatedText = contractPlainText.length > MAX_CHARS
      ? contractPlainText.slice(0, MAX_CHARS) + "\n...(noi dung con lai giu nguyen chua dien)..."
      : contractPlainText;

    const fillPrompt = `Ban la chuyen gia soan thao hop dong lao dong Viet Nam.

Duoi day la noi dung hop dong lao dong (trich xuat tu file Word). Hay dien day du thong tin nguoi lao dong vao cac cho trong trong hop dong.

THONG TIN NGUOI LAO DONG:
${employeeInfo}

YEU CAU XU LY:
1. Giu NGUYEN VEN toan bo cau truc, dieu khoan, va noi dung hop dong - chi dien vao cac cho trong.
2. Cac cho trong thuong la: day gach chan (______), dau cham lua (.......), ngoac rong (..........), cho de trong sau dau hai cham (:).
3. Dien dung thong tin vao dung vi tri dua tren ngu canh xung quanh.
4. Nhung thong tin chua co (dia chi cong ty, thong tin nguoi ky, v.v.) giu nguyen cho trong.
5. Tra ve TOAN BO van ban hop dong da dien, khong rut gon, khong them giai thich.

NOI DUNG HOP DONG GOC:
${truncatedText}`;

    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    let fillResult;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        fillResult = await model.generateContent(fillPrompt);
        break;
      } catch (retryErr) {
        const isRateLimit = retryErr.message?.includes("rate-limit") || retryErr.message?.includes("429") || retryErr.message?.includes("Quota");
        if (isRateLimit && attempt < 3) {
          const waitMs = attempt * 20000;
          console.warn(`[ContractGenerate] Rate limit hit, thu lai sau ${waitMs / 1000}s... (lan ${attempt}/3)`);
          await delay(waitMs);
        } else {
          throw retryErr;
        }
      }
    }

    const filledText = fillResult.response.text().trim();
    console.log("[ContractGenerate] OK: Gemini da dien xong.");

    const zip = new PizZip(templateFile.buffer);
    const xmlLines = filledText.split("\n").map(line => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
      return `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:lang w:val="vi-VN"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
    });
    const newDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable=""><w:body>${xmlLines.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    zip.file("word/document.xml", newDocXml);
    const buf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="HopDong_${updatedEmp.empCode}.docx"`,
      "Content-Length": buf.length,
      "Access-Control-Expose-Headers": "Content-Disposition",
    });
    return res.send(buf);

  } catch (error) {
    console.error("[ContractGenerate] === LOI XUAT HIEN ===");
    console.error("[ContractGenerate] Message:", error.message);
    console.error("[ContractGenerate] Stack:", error.stack);
    return res.status(500).json({ success: false, message: error.message, detail: error.stack?.split("\n")[1] });
  }
};
