import cron from "node-cron";
import ExcelJS from "exceljs";
import { runHRMSync } from "../controllers/hrmSyncController.js";
import Employee from "../models/Employee.js";
import BirthDay from "../models/BirthDay.js";
import HolidayEvent from "../models/HolidayEvent.js";
import { sendMail } from "./sendMail.js";
import { loginCRM, sendZaloCampaign } from "../utils/crmZaloService.js";

// ─────────────────────────────────────────────────────────────
// HELPER: Gửi email cảnh báo hợp đồng đến một nhân viên
// ─────────────────────────────────────────────────────────────
const sendContractWarningEmail = async (emp, daysLeft) => {
  if (!emp.email) return { sent: false, reason: "Không có email" };

  const expiry = new Date(emp.endDateOfContract).toLocaleDateString("vi-VN");
  const urgencyColor = daysLeft <= 7 ? "#dc2626" : "#d97706";
  const urgencyLabel = daysLeft <= 7 ? "⚠️ KHẨN CẤP" : "⏰ Sắp hết hạn";

  const contractTypeLabel = {
    probation: "Thử việc",
    "fixed-term": "Xác định thời hạn",
    indefinite: "Không xác định thời hạn",
  }[emp.contractType] || emp.contractType;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Thông báo hợp đồng sắp hết hạn</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #1677ff 0%, #0050b3 100%); padding: 40px 36px 32px; text-align: center; }
    .header-icon { font-size: 48px; margin-bottom: 12px; display: block; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; }
    .badge-warning { display: inline-block; background: #fff3cd; color: #92400e; border: 1.5px solid #fbbf24; border-radius: 20px; padding: 4px 16px; font-size: 13px; font-weight: 700; margin-top: 14px; }
    .body { padding: 36px 36px 28px; }
    .greeting { font-size: 16px; color: #1f2937; margin-bottom: 18px; line-height: 1.7; }
    .greeting strong { color: #1677ff; }
    .info-box { background: #f8faff; border: 1.5px solid #dbeafe; border-radius: 12px; padding: 22px 24px; margin: 22px 0; }
    .info-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
    .info-row:last-child { border-bottom: none; }
    .info-label { min-width: 150px; color: #6b7280; font-weight: 500; }
    .info-value { color: #111827; font-weight: 600; }
    .days-highlight { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b; border-radius: 10px; padding: 14px 20px; margin: 20px 0; display: flex; align-items: center; gap: 14px; }
    .days-highlight .icon { font-size: 28px; }
    .days-highlight .text strong { font-size: 18px; color: #92400e; display: block; }
    .days-highlight .text span { font-size: 13px; color: #78350f; }
    .alert-box { background: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 10px 10px 0; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #7c2d12; line-height: 1.7; }
    .cta-section { text-align: center; margin: 30px 0 10px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #1677ff, #0050b3); color: #fff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 50px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 36px; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.8; }
    .footer .brand { font-size: 13px; font-weight: 700; color: #1677ff; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-icon">📋</span>
      <h1>Thông báo Hợp đồng Sắp hết hạn</h1>
      <p>Hệ thống Quản lý Nhân sự – HCNS FumeeTech</p>
      <span class="badge-warning" style="background:${urgencyColor};color:#fff;border-color:${urgencyColor}">${urgencyLabel}</span>
    </div>
    <div class="body">
      <p class="greeting">
        Kính gửi <strong>${emp.fullName}</strong>,<br/><br/>
        Hệ thống Quản lý Nhân sự của <strong>FumeeTech</strong> xin thông báo rằng hợp đồng lao động của bạn sẽ <strong>hết hạn trong thời gian tới</strong>. Đề nghị bạn liên hệ Phòng Nhân sự để thực hiện các thủ tục cần thiết.
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">👤 Mã nhân viên</span>
          <span class="info-value">${emp.empCode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">💼 Chức vụ</span>
          <span class="info-value">${emp.positionName || "—"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📄 Loại hợp đồng</span>
          <span class="info-value">${contractTypeLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📅 Ngày hết hạn</span>
          <span class="info-value" style="color:${urgencyColor}">⏰ ${expiry}</span>
        </div>
      </div>
      <div class="days-highlight">
        <span class="icon">⏳</span>
        <div class="text">
          <strong>Còn ${daysLeft} ngày đến khi hết hạn</strong>
          <span>Vui lòng xử lý trước thời hạn để tránh gián đoạn.</span>
        </div>
      </div>
      <div class="alert-box">
        <strong>📌 Lưu ý:</strong> Nếu hợp đồng hết hạn mà chưa được gia hạn, quan hệ lao động có thể bị ảnh hưởng theo quy định pháp luật lao động.
      </div>
      <div class="cta-section">
        <a href="mailto:hr@fumeetech.vn" class="cta-btn">📞 Liên hệ Phòng Nhân sự ngay</a>
      </div>
    </div>
    <div class="footer">
      <p class="brand">HCNS – FumeeTech HR System</p>
      <p>Đây là email tự động. Vui lòng không trả lời email này.<br/>© 2026 FumeeTech. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await sendMail({
    to: emp.email,
    subject: `⚠️ [HCNS] Hợp đồng ${emp.fullName} (${emp.empCode}) sắp hết hạn – còn ${daysLeft} ngày`,
    html,
  });

  return { sent: true };
};

// ─────────────────────────────────────────────────────────────
// HELPER: Tạo file Excel báo cáo cho HR
// ─────────────────────────────────────────────────────────────
const createHRExcelReport = async (employees) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hợp đồng sắp hết hạn");

  worksheet.columns = [
    { header: "Mã NV", key: "empCode", width: 15 },
    { header: "Họ và Tên", key: "fullName", width: 30 },
    { header: "Chức vụ", key: "positionName", width: 25 },
    { header: "Phòng ban", key: "departmentName", width: 25 },
    { header: "Loại HĐ", key: "contractType", width: 20 },
    { header: "Ngày hết hạn", key: "endDate", width: 20 },
    { header: "Còn lại (ngày)", key: "daysLeft", width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { horizontal: 'center' };

  employees.forEach((emp) => {
    const contractTypeLabel = {
      probation: "Thử việc",
      "fixed-term": "Xác định thời hạn",
      indefinite: "Không xác định thời hạn",
    }[emp.contractType] || emp.contractType;

    worksheet.addRow({
      empCode: emp.empCode,
      fullName: emp.fullName,
      positionName: emp.positionName || "—",
      departmentName: emp.departmentName || "—",
      contractType: contractTypeLabel,
      endDate: new Date(emp.endDateOfContract).toLocaleDateString("vi-VN"),
      daysLeft: emp.daysLeft,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

// ─────────────────────────────────────────────────────────────
// HELPER: Gửi email chúc mừng sinh nhật
// ─────────────────────────────────────────────────────────────
const sendBirthdayEmail = async (emp) => {
  if (!emp.email) return { sent: false, reason: "Không có email" };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Chúc mừng sinh nhật</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ec4899 60%, #8b5cf6 100%); padding: 40px 36px 32px; text-align: center; }
    .header-icon { font-size: 56px; margin-bottom: 10px; display: block; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; }
    .body { padding: 36px 36px 28px; }
    .greeting { font-size: 16px; color: #1f2937; margin-bottom: 18px; line-height: 1.8; }
    .greeting strong { color: #f97316; }
    .info-box { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 12px; padding: 22px 24px; margin: 22px 0; }
    .info-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #fde8d0; font-size: 14px; color: #374151; }
    .info-row:last-child { border-bottom: none; }
    .info-label { min-width: 150px; color: #9a3412; font-weight: 500; }
    .info-value { color: #111827; font-weight: 600; }
    .wish-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px 24px; margin: 20px 0; text-align: center; font-size: 15px; color: #78350f; line-height: 1.8; font-style: italic; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 36px; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.8; }
    .footer .brand { font-size: 13px; font-weight: 700; color: #f97316; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-icon">🎂</span>
      <h1>Chúc Mừng Sinh Nhật!</h1>
      <p>Hệ thống Quản lý Nhân sự – HCNS FumeeTech</p>
    </div>
    <div class="body">
      <p class="greeting">
        Kính gửi <strong>${emp.fullName}</strong>,<br/><br/>
        Nhân dịp sinh nhật của bạn, toàn thể Ban lãnh đạo và tập thể <strong>FumeeTech</strong>
        xin gửi đến bạn lời chúc mừng sinh nhật nồng nhiệt nhất! 🎉
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">👤 Mã nhân viên</span>
          <span class="info-value">${emp.empCode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">💼 Chức vụ</span>
          <span class="info-value">${emp.positionName || "—"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🏢 Phòng ban</span>
          <span class="info-value">${emp.departmentName || "—"}</span>
        </div>
      </div>
      <div class="wish-box">
        🌟 "Chúc bạn luôn tràn đầy sức khỏe, niềm vui và thành công trong công việc cũng như cuộc sống.<br/>
        Tuổi mới, thêm nhiều may mắn và hạnh phúc!" 🌟
      </div>
    </div>
    <div class="footer">
      <p class="brand">HCNS – FumeeTech HR System</p>
      <p>Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.<br/>© 2026 FumeeTech. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await sendMail({
    to: emp.email,
    subject: `🎂 [HCNS] Chúc mừng sinh nhật ${emp.fullName} (${emp.empCode})!`,
    html,
  });

  return { sent: true };
};

// ─────────────────────────────────────────────────────────────
// MAIN: Khởi tạo tất cả cron jobs
// ─────────────────────────────────────────────────────────────
const initCronJobs = () => {
  // ── JOB 1: Tự động đồng bộ dữ liệu từ HRM API ──
  // Chạy mỗi ngày lúc 07:00 sáng (giờ VN)
  cron.schedule(
    "0 7 * * *",
    async () => {
      console.log("[Cron/HRM] Bắt đầu tự động đồng bộ từ HRM API...");
      try {
        const results = await runHRMSync();
        console.log(
          `[Cron/HRM] ✅ Hoàn tất: ${results.inserted} thêm mới, ${results.updated} cập nhật, ${results.skipped} bỏ qua`
        );
      } catch (err) {
        console.error("[Cron/HRM] ❌ Lỗi đồng bộ HRM:", err.message);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // ── JOB 2: Quét hợp đồng sắp hết hạn và gửi email cảnh báo ──
  // Chạy mỗi ngày lúc 08:00 sáng (giờ VN)
  cron.schedule(
    "0 8 * * *",
    // "* * * * *",
    async () => {
      console.log("[Cron/Contract] Bắt đầu quét hợp đồng sắp hết hạn...");
      try {
        const now = new Date();

        // Quét những nhân viên có hợp đồng hết hạn trong vòng 30 ngày tới
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringEmployees = await Employee.find({
          status: "active",
          contractType: { $ne: "indefinite" }, // bỏ qua hợp đồng vô thời hạn
          endDateOfContract: {
            $gte: now,
            $lte: in30Days,
          },
        }).lean();

        if (expiringEmployees.length === 0) {
          console.log("[Cron/Contract] Không có hợp đồng nào sắp hết hạn.");
          return;
        }

        console.log(`[Cron/Contract] Tìm thấy ${expiringEmployees.length} hợp đồng sắp hết hạn`);

        let sentCount = 0;
        let skipCount = 0;
        let hrReportList = [];

        for (const emp of expiringEmployees) {
          const daysLeft = Math.ceil(
            (new Date(emp.endDateOfContract) - now) / (1000 * 60 * 60 * 24)
          );

          // Chỉ gửi email ở các mốc: 30 ngày, 14 ngày, 7 ngày, 3 ngày, 1 ngày
          const notifyThresholds = [30, 14, 7, 3, 1];
          if (!notifyThresholds.includes(daysLeft)) {
            skipCount++;
            continue;
          }

          // Thêm vào danh sách báo cáo HR nếu đúng các mốc yêu cầu
          if ([30, 14, 7, 3, 1].includes(daysLeft)) {
            hrReportList.push({ ...emp, daysLeft });
          }

          try {
            const result = await sendContractWarningEmail(emp, daysLeft);
            if (result.sent) {
              sentCount++;
              console.log(`[Cron/Contract] ✉️ Đã gửi → ${emp.fullName} (${emp.empCode}) — còn ${daysLeft} ngày`);
            } else {
              console.log(`[Cron/Contract] ⏭ Bỏ qua ${emp.empCode}: ${result.reason}`);
              skipCount++;
            }
          } catch (mailErr) {
            console.error(`[Cron/Contract] ❌ Gửi mail thất bại cho ${emp.empCode}:`, mailErr.message);
          }
        }

        console.log(
          `[Cron/Contract] Hoàn tất: ${sentCount} email đã gửi, ${skipCount} bỏ qua (không đến mốc cảnh báo hoặc thiếu email)`
        );

        // Gửi báo cáo Excel cho HR
        if (hrReportList.length > 0) {
          if (process.env.EMAIL_HCNS) {
            try {
              console.log(`[Cron/Contract] Đang tạo file Excel báo cáo cho HR gồm ${hrReportList.length} hợp đồng...`);
              const excelBuffer = await createHRExcelReport(hrReportList);

              const hrHtml = `
                <h2>Báo cáo hợp đồng sắp hết hạn</h2>
                <p>Kính gửi Phòng Hành chính Nhân sự,</p>
                <p>Hệ thống tự động gửi danh sách các nhân sự có hợp đồng lao động sắp hết hạn (còn 30, 14, 7, 1 ngày).</p>
                <p>Vui lòng xem file Excel đính kèm để biết chi tiết.</p>
                <br/>
                <p>Trân trọng,<br/>Hệ thống Quản lý Nhân sự - HCNS FumeeTech</p>
              `;

              await sendMail({
                to: process.env.EMAIL_HCNS,
                subject: `[HCNS] Báo cáo danh sách hợp đồng sắp hết hạn (${new Date().toLocaleDateString('vi-VN')})`,
                html: hrHtml,
                attachments: [
                  {
                    filename: `Bao_Cao_Hop_Dong_${new Date().getTime()}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  }
                ]
              });
              console.log("[Cron/Contract] Đã gửi email báo cáo Excel cho phòng HCNS.");
            } catch (hrErr) {
              console.error("[Cron/Contract] Lỗi gửi báo cáo HR:", hrErr.message);
            }
          } else {
            console.log("[Cron/Contract] EMAIL_HCNS chưa được cấu hình, bỏ qua gửi báo cáo Excel cho HR.");
          }
        }
      } catch (err) {
        console.error("[Cron/Contract] Lỗi quét hợp đồng:", err.message);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // ── JOB 3: Thông báo sinh nhật nhân viên qua Zalo CRM ──
  // Chạy mỗi ngày lúc 07:30 sáng (giờ VN)
  cron.schedule(
    "30 7 * * *",
    async () => {
      console.log("[Cron/Birthday] Bắt đầu quét sinh nhật hôm nay...");
      try {
        const now = new Date();
        const todayMonth = now.getMonth() + 1; // 1-12
        const todayDay = now.getDate();        // 1-31

        // Tìm nhân viên có sinh nhật hôm nay (so sánh tháng + ngày)
        const allActive = await Employee.find({
          status: "active",
          birthday: { $ne: null },
          deletedAt: null,
        }).lean();

        const birthdayEmployees = allActive.filter((emp) => {
          if (!emp.birthday) return false;
          const bd = new Date(emp.birthday);
          return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay;
        });

        if (birthdayEmployees.length === 0) {
          console.log("[Cron/Birthday] Hôm nay không có sinh nhật nào.");
          return;
        }

        console.log(`[Cron/Birthday] 🎂 Hôm nay có ${birthdayEmployees.length} sinh nhật`);

        const birthdayList = [...birthdayEmployees];

        // ── GỬI ZALO CAMPAIGN QUA CRM ─────────────────────────────────
        console.log("[Cron/Birthday/Zalo] Bắt đầu gửi Zalo chúc mừng sinh nhật...");
        try {
          const channelId = process.env.ID_ZALO_CRM;
          if (!channelId) {
            console.warn("[Cron/Birthday/Zalo] Thiếu ID_ZALO_CRM trong .env, bỏ qua gửi Zalo.");
          } else {
            // Lấy tất cả lời chúc từ DB phân theo giới tính
            const allWishes = await BirthDay.find().lean();

            // Hàm chọn lời chúc ngẫu nhiên theo giới tính
            const getWish = (gender) => {
              // Ưu tiên lời chúc đúng giới tính, fallback về "other"
              const matched = allWishes.filter(
                (w) => w.gender === gender || w.gender === "other"
              );
              const exact = allWishes.filter((w) => w.gender === gender);
              const pool = exact.length > 0 ? exact : matched;
              if (pool.length === 0) return null;
              return pool[Math.floor(Math.random() * pool.length)].birthDayWish;
            };

            // Chia nhân viên theo giới tính và lọc những ai có số điện thoại
            const maleEmps = birthdayList.filter((e) => e.gender === "male" && e.phone);
            const femaleEmps = birthdayList.filter((e) => e.gender === "female" && e.phone);
            const otherEmps = birthdayList.filter((e) => e.gender !== "male" && e.gender !== "female" && e.phone);

            // Đăng nhập CRM được quản lý tự động bên trong crmZaloService
            const dateLabel = `${String(todayDay).padStart(2, "0")}/${String(todayMonth).padStart(2, "0")}`;

            // Gửi campaign cho Nam
            if (maleEmps.length > 0) {
              const wishContent = getWish("male");
              if (!wishContent) {
                console.warn("[Cron/Birthday/Zalo] ⚠️ Không tìm thấy lời chúc cho Nam, bỏ qua.");
              } else {
                const malePhones = maleEmps.map((e) => e.phone);
                try {
                  const result = await sendZaloCampaign({
                    campaignName: `Chúc mừng sinh nhật Nam ${dateLabel}`,
                    channelId,
                    content: wishContent,
                    phones: malePhones,
                  });
                  console.log(
                    `[Cron/Birthday/Zalo] 🎉 Campaign Nam gửi thành công (${maleEmps.length} người):`,
                    result?.name || result
                  );
                } catch (zaloErr) {
                  console.error("[Cron/Birthday/Zalo] ❌ Gửi campaign Nam thất bại:", zaloErr.message);
                }
              }
            }

            // Gửi campaign cho Nữ
            if (femaleEmps.length > 0) {
              const wishContent = getWish("female");
              if (!wishContent) {
                console.warn("[Cron/Birthday/Zalo] ⚠️ Không tìm thấy lời chúc cho Nữ, bỏ qua.");
              } else {
                const femalePhones = femaleEmps.map((e) => e.phone);
                try {
                  const result = await sendZaloCampaign({
                    campaignName: `Chúc mừng sinh nhật Nữ ${dateLabel}`,
                    channelId,
                    content: wishContent,
                    phones: femalePhones,
                  });
                  console.log(
                    `[Cron/Birthday/Zalo] 🎉 Campaign Nữ gửi thành công (${femaleEmps.length} người):`,
                    result?.name || result
                  );
                } catch (zaloErr) {
                  console.error("[Cron/Birthday/Zalo] ❌ Gửi campaign Nữ thất bại:", zaloErr.message);
                }
              }
            }

            // Gửi campaign cho Khác (dùng lời chúc "other" hoặc fallback Nam)
            if (otherEmps.length > 0) {
              const wishContent = getWish("other");
              if (!wishContent) {
                console.warn("[Cron/Birthday/Zalo] ⚠️ Không tìm thấy lời chúc cho Khác, bỏ qua.");
              } else {
                const otherPhones = otherEmps.map((e) => e.phone);
                try {
                  const result = await sendZaloCampaign({
                    campaignName: `Chúc mừng sinh nhật ${dateLabel}`,
                    channelId,
                    content: wishContent,
                    phones: otherPhones,
                  });
                  console.log(
                    `[Cron/Birthday/Zalo] 🎉 Campaign Khác gửi thành công (${otherEmps.length} người):`,
                    result?.name || result
                  );
                } catch (zaloErr) {
                  console.error("[Cron/Birthday/Zalo] ❌ Gửi campaign Khác thất bại:", zaloErr.message);
                }
              }
            }

            const noPhoneCount = birthdayList.filter((e) => !e.phone).length;
            if (noPhoneCount > 0) {
              console.warn(`[Cron/Birthday/Zalo] ⚠️ ${noPhoneCount} nhân viên không có số điện thoại, bỏ qua Zalo.`);
            }
          }
        } catch (zaloJobErr) {
          console.error("[Cron/Birthday/Zalo] ❌ Lỗi tổng quát khi gửi Zalo:", zaloJobErr.message);
        }
        // ── KẾT THÚC GỬI ZALO ─────────────────────────────────────────

      } catch (err) {
        console.error("[Cron/Birthday] Lỗi:", err.message);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // ── JOB 4: Tự động gửi thông báo/lời chúc nghỉ lễ qua Zalo ──
  // Chạy mỗi ngày lúc 08:00 sáng (giờ VN)
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("[Cron/Holiday] Bắt đầu kiểm tra sự kiện nghỉ lễ...");
      try {
        const channelId = process.env.ID_ZALO_CRM;
        if (!channelId) {
          console.warn("[Cron/Holiday] Thiếu ID_ZALO_CRM trong .env, bỏ qua.");
          return;
        }

        // Lấy ngày hôm nay theo giờ VN (reset về 00:00:00)
        const now = new Date();
        const todayVN = new Date(
          now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
        );
        todayVN.setHours(0, 0, 0, 0);

        // Lấy tất cả sự kiện chưa bị xóa và còn trong tương lai (end_date >= hôm nay)
        const events = await HolidayEvent.find({
          end_date: { $gte: todayVN },
        }).lean();

        if (events.length === 0) {
          console.log("[Cron/Holiday] Không có sự kiện nghỉ lễ nào cần xử lý.");
          return;
        }

        console.log(`[Cron/Holiday] Tìm thấy ${events.length} sự kiện cần kiểm tra.`);

        // Helper: render template placeholder
        const renderTemplate = (template, vars = {}) => {
          if (!template) return "";
          return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
        };

        // Lấy tất cả nhân viên active có số điện thoại (dùng chung cho mọi event)
        const employees = await Employee.find({
          status: { $nin: ["inactive", "terminated"] },
          phone: { $nin: [null, ""] },
          deletedAt: null,
        }).lean();
        const phones = employees.map((e) => e.phone).filter(Boolean);

        if (phones.length === 0) {
          console.log("[Cron/Holiday] Không có nhân viên nào có SĐT, bỏ qua.");
          return;
        }

        for (const event of events) {
          const startDate = new Date(event.start_date);
          startDate.setHours(0, 0, 0, 0);
          const dateLabel = startDate.toLocaleDateString("vi-VN");

          const diffMs = startDate.getTime() - todayVN.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          // ── KIỂM TRA 1: Thông báo trước kỳ nghỉ ─────────────────────
          if (diffDays === event.notify_advance_days && !event.is_notified) {
            if (!event.announcement_template) {
              console.log(`[Cron/Holiday] ⏭ Bỏ qua thông báo "${event.title}": không có announcement_template.`);
            } else {
              const content = renderTemplate(event.announcement_template, {
                title: event.title,
                start_date: dateLabel,
                end_date: new Date(event.end_date).toLocaleDateString("vi-VN"),
                back_to_work_date: event.back_to_work_date
                  ? new Date(event.back_to_work_date).toLocaleDateString("vi-VN")
                  : "",
                notify_advance_days: event.notify_advance_days,
              });

              try {
                await sendZaloCampaign({
                  campaignName: `[Thông báo nghỉ lễ] ${event.title}`,
                  channelId,
                  content,
                  phones,
                });
                // Cập nhật trạng thái
                await HolidayEvent.findByIdAndUpdate(event._id, {
                  is_notified: true,
                  notified_at: new Date(),
                  notified_count: phones.length,
                });
                console.log(
                  `[Cron/Holiday] ✅ Đã gửi thông báo: "${event.title}" (${phones.length} người, còn ${diffDays} ngày)`
                );
              } catch (err) {
                console.error(`[Cron/Holiday] ❌ Gửi thông báo "${event.title}" thất bại:`, err.message);
              }
            }
          }

          // ── KIỂM TRA 2: Lời chúc ngày bắt đầu nghỉ ─────────────────
          if (diffDays === 0 && !event.is_wished) {
            if (!event.wish_template) {
              console.log(`[Cron/Holiday] ⏭ Bỏ qua lời chúc "${event.title}": không có wish_template.`);
            } else {
              const content = renderTemplate(event.wish_template, {
                title: event.title,
                start_date: dateLabel,
              });

              try {
                await sendZaloCampaign({
                  campaignName: `[Lời chúc] ${event.title}`,
                  channelId,
                  content,
                  phones,
                });
                // Cập nhật trạng thái
                await HolidayEvent.findByIdAndUpdate(event._id, {
                  is_wished: true,
                  wished_at: new Date(),
                  wished_count: phones.length,
                });
                console.log(
                  `[Cron/Holiday] 🎉 Đã gửi lời chúc: "${event.title}" (${phones.length} người)`
                );
              } catch (err) {
                console.error(`[Cron/Holiday] ❌ Gửi lời chúc "${event.title}" thất bại:`, err.message);
              }
            }
          }
        }

        console.log("[Cron/Holiday] ✅ Hoàn tất kiểm tra sự kiện nghỉ lễ.");
      } catch (err) {
        console.error("[Cron/Holiday] ❌ Lỗi tổng quát:", err.message);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  console.log("[Cron] Đã đăng ký:");
  console.log("  📡 Job 1 — Auto-sync HRM API: Mỗi ngày lúc 07:00");
  console.log("  📧 Job 2 — Cảnh báo hợp đồng: Mỗi ngày lúc 08:00 (gửi ở mốc 30/14/7/3/1 ngày)");
  console.log("  🎂 Job 3 — Thông báo sinh nhật (Email + Zalo): Mỗi ngày lúc 07:30");
  console.log("  🎉 Job 4 — Thông báo & lời chúc nghỉ lễ (Zalo): Mỗi ngày lúc 08:00");
};

export default initCronJobs;
