import mongoose from "mongoose";

const GdtInvoiceItemSchema = new mongoose.Schema({
  item_code: { type: String, default: "" },
  item_name: { type: String, required: true },
  unit: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  unit_price: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  tax_rate: { type: Number, default: 0 }, // e.g., 0, 5, 8, 10
  tax_amount: { type: Number, default: 0 },
  debit_account: { type: String, default: "1561" },
  credit_account: { type: String, default: "331" },
  inventory_item_id_misa: { type: String, default: "" }
}, { _id: false });

const GdtInvoiceSchema = new mongoose.Schema({
  // Thông tin định danh hóa đơn TCT
  nbmst: { type: String, required: true, index: true }, // MST Bên Bán
  nbten: { type: String, required: true }, // Tên Bên Bán
  nbdchi: { type: String, default: "" }, // Địa chỉ Bên Bán
  khhdon: { type: String, required: true }, // Ký hiệu (VD: 1C26TNN)
  shdon: { type: String, required: true }, // Số hóa đơn (VD: 0001234)
  khmshdon: { type: String, default: "1" }, // Mẫu số (VD: 1)
  tdlap: { type: Date, required: true }, // Ngày lập
  
  // Giá trị tiền
  tgtttbso: { type: Number, default: 0 }, // Tổng tiền chưa thuế
  tgtthue: { type: Number, default: 0 }, // Tổng thuế
  tgttoan: { type: Number, default: 0 }, // Tổng thanh toán
  
  // Dữ liệu XML gốc và chi tiết
  xml_raw_data: { type: String, default: "" },
  items: [GdtInvoiceItemSchema],
  
  // Trạng thái đồng bộ MISA
  sync_misa_status: { 
    type: String, 
    enum: ["pending", "mapped", "synced_misa", "failed"], 
    default: "pending" 
  },
  misa_ref_id: { type: String, default: "" },
  misa_ref_no: { type: String, default: "" },
  misa_sync_error: { type: String, default: "" },
  misa_synced_at: { type: Date },

  // Ghi chú nội bộ
  note: { type: String, default: "" }
}, {
  timestamps: true
});

GdtInvoiceSchema.index({ nbmst: 1, khhdon: 1, shdon: 1 }, { unique: true });

export default mongoose.model("GdtInvoice", GdtInvoiceSchema);
