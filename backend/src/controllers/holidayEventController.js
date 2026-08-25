import HolidayEvent from "../models/HolidayEvent.js";
import Employee from "../models/Employee.js";
import { sendZaloCampaign } from "../utils/crmZaloService.js";

const renderTemplate = (template, vars = {}) => {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
};

const getUserId = (req) => req.user?._id || req.user?.id || null;

export const getHolidayEvents = async (req, res) => {
  try {
    const { year, month, upcoming, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Lọc theo năm
    if (year) {
      const y = parseInt(year);
      filter.start_date = {
        $gte: new Date(`${y}-01-01`),
        $lte: new Date(`${y}-12-31T23:59:59`),
      };
    }

    // Lọc theo tháng (kết hợp với năm nếu có)
    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);
      filter.start_date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Chỉ lấy sự kiện sắp tới và hiện tại
    if (upcoming === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.end_date = { $gte: today };
    }

    // Phân trang
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    // Lấy danh sách đã phân trang
    const events = await HolidayEvent.find(filter)
      .sort({ start_date: -1 }) // Sắp xếp mới nhất lên trước cho danh sách quản lý
      .skip(skipNum)
      .limit(limitNum)
      .lean();

    const total = await HolidayEvent.countDocuments(filter);

    // Tính toán stats và upcomingEvents cho timeline
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const upcomingCount = await HolidayEvent.countDocuments({
      end_date: { $gte: today }
    });

    const notNotifiedCount = await HolidayEvent.countDocuments({
      is_notified: false,
      start_date: { $gte: today }
    });

    const notWishedCount = await HolidayEvent.countDocuments({
      is_wished: false,
      start_date: { $gte: today, $lte: todayEnd }
    });

    // Top 5 upcoming events cho timeline (sắp xếp tăng dần theo start_date để hiển thị timeline)
    const upcomingEvents = await HolidayEvent.find({
      end_date: { $gte: today }
    })
      .sort({ start_date: 1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      data: events,
      total,
      page: pageNum,
      limit: limitNum,
      stats: {
        upcomingCount,
        notNotifiedCount,
        notWishedCount
      },
      upcomingEvents
    });
  } catch (error) {
    console.error("[HolidayEvent] getHolidayEvents error:", error.message);
    return res.status(500).json({ success: false, message: "Lấy danh sách sự kiện thất bại" });
  }
};

export const createHolidayEvent = async (req, res) => {
  try {
    const {
      title,
      start_date,
      end_date,
      back_to_work_date,
      notify_advance_days,
      announcement_template,
      wish_template,
      company,
    } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: title, start_date, end_date",
      });
    }

    const event = new HolidayEvent({
      company: company || req.user?.company,
      title: title.trim(),
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      back_to_work_date: back_to_work_date ? new Date(back_to_work_date) : null,
      notify_advance_days: notify_advance_days ?? 2,
      announcement_template,
      wish_template,
      is_notified: false,
      is_wished: false,
      createdBy: getUserId(req),
    });

    await event.save();

    return res.status(201).json({
      success: true,
      message: "Tạo sự kiện nghỉ lễ thành công",
      data: event,
    });
  } catch (error) {
    console.error("[HolidayEvent] createHolidayEvent error:", error.message);
    return res.status(500).json({ success: false, message: "Tạo sự kiện thất bại" });
  }
};

export const updateHolidayEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      start_date,
      end_date,
      back_to_work_date,
      notify_advance_days,
      announcement_template,
      wish_template,
      is_notified,
      is_wished,
      notified_count,
      notified_at,
      wished_count,
      wished_at,
    } = req.body;

    const event = await HolidayEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    if (title !== undefined) event.title = title.trim();
    if (start_date !== undefined) event.start_date = new Date(start_date);
    if (end_date !== undefined) event.end_date = new Date(end_date);
    if (back_to_work_date !== undefined) event.back_to_work_date = back_to_work_date ? new Date(back_to_work_date) : null;
    if (notify_advance_days !== undefined) event.notify_advance_days = notify_advance_days;
    if (announcement_template !== undefined) event.announcement_template = announcement_template;
    if (wish_template !== undefined) event.wish_template = wish_template;

    if (is_notified !== undefined) event.is_notified = is_notified;
    if (is_wished !== undefined) event.is_wished = is_wished;
    if (notified_count !== undefined) event.notified_count = notified_count;
    if (notified_at !== undefined) event.notified_at = notified_at;
    if (wished_count !== undefined) event.wished_count = wished_count;
    if (wished_at !== undefined) event.wished_at = wished_at;

    event.updatedBy = getUserId(req);
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật sự kiện thành công",
      data: event,
    });
  } catch (error) {
    console.error("[HolidayEvent] updateHolidayEvent error:", error.message);
    return res.status(500).json({ success: false, message: "Cập nhật sự kiện thất bại" });
  }
};

export const deleteHolidayEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await HolidayEvent.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }
    return res.status(200).json({ success: true, message: "Xóa sự kiện thành công" });
  } catch (error) {
    console.error("[HolidayEvent] deleteHolidayEvent error:", error.message);
    return res.status(500).json({ success: false, message: "Xóa sự kiện thất bại" });
  }
};

export const triggerHolidayEventManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "both" } = req.query;

    const event = await HolidayEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    const channelId = process.env.ID_ZALO_CRM;
    if (!channelId) {
      return res.status(500).json({
        success: false,
        message: "Thiếu ID_ZALO_CRM trong .env, không thể gửi Zalo",
      });
    }

    const employees = await Employee.find({
      status: { $nin: ["inactive", "terminated"] },
      phone: { $nin: [null, ""] },
      deletedAt: null,
    }).lean();

    const phones = employees.map((e) => e.phone).filter(Boolean);

    if (phones.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Không có nhân viên nào có số điện thoại để gửi",
        sent: 0,
      });
    }

    const results = {};
    const dateLabel = new Date(event.start_date).toLocaleDateString("vi-VN");

    if ((type === "announcement" || type === "both") && event.announcement_template) {
      const content = renderTemplate(event.announcement_template, {
        title: event.title,
        start_date: dateLabel,
        end_date: new Date(event.end_date).toLocaleDateString("vi-VN"),
        back_to_work_date: event.back_to_work_date
          ? new Date(event.back_to_work_date).toLocaleDateString("vi-VN")
          : "",
      });

      try {
        const result = await sendZaloCampaign({
          campaignName: `[Thông báo] ${event.title} – ${dateLabel}`,
          channelId,
          content,
          phones,
        });
        event.is_notified = true;
        event.notified_at = new Date();
        event.notified_count = phones.length;
        results.announcement = { success: true, recipients: phones.length, campaign: result?.name };
        console.log(`[HolidayEvent/Manual] ✅ Đã gửi thông báo lịch nghỉ: ${event.title} (${phones.length} người)`);
      } catch (err) {
        results.announcement = { success: false, error: err.message };
        console.error(`[HolidayEvent/Manual] ❌ Gửi thông báo thất bại:`, err.message);
      }
    }

    if ((type === "wish" || type === "both") && event.wish_template) {
      const content = renderTemplate(event.wish_template, {
        title: event.title,
        start_date: dateLabel,
      });

      try {
        const result = await sendZaloCampaign({
          campaignName: `[Lời chúc] ${event.title} – ${dateLabel}`,
          channelId,
          content,
          phones,
        });
        event.is_wished = true;
        event.wished_at = new Date();
        event.wished_count = phones.length;
        results.wish = { success: true, recipients: phones.length, campaign: result?.name };
        console.log(`[HolidayEvent/Manual] ✅ Đã gửi lời chúc: ${event.title} (${phones.length} người)`);
      } catch (err) {
        results.wish = { success: false, error: err.message };
        console.error(`[HolidayEvent/Manual] ❌ Gửi lời chúc thất bại:`, err.message);
      }
    }

    event.updatedBy = getUserId(req);
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Kích hoạt gửi thủ công thành công",
      recipients: phones.length,
      results,
    });
  } catch (error) {
    console.error("[HolidayEvent] triggerHolidayEventManual error:", error.message);
    return res.status(500).json({ success: false, message: "Kích hoạt gửi thất bại" });
  }
};
