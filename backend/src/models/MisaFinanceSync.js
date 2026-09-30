import mongoose from "mongoose";

const MisaFinanceSyncSchema = new mongoose.Schema({
  voucher_type: { 
    type: String, 
    enum: ["PU_VOUCHER", "CA_PAYMENT", "CA_RECEIPT"], 
    required: true 
  },
  erp_ref_id: { type: String, default: "" }, // ID đề nghị tài chính hoặc HĐ trên ERP
  refno: { type: String, required: true }, // Số phiếu (VD: PC000456, PT036/26, CTM000089)
  refdate: { type: Date, default: Date.now },
  posted_date: { type: Date, default: Date.now },
  
  // Đối tượng giao dịch
  accounting_object_id: { type: String, default: "" },
  accounting_object_name: { type: String, default: "" },
  journal_memo: { type: String, default: "" },
  total_amount: { type: Number, required: true },
  
  // Chi tiết hạch toán
  details: [{
    description: String,
    debit_account: String,
    credit_account: String,
    amount: Number,
    cost_center_id: String
  }],

  // Kết quả đẩy MISA
  misa_ref_id: { type: String, default: "" },
  status: { type: String, enum: ["pending", "synced", "posted_ledger", "failed"], default: "pending" },
  error_message: { type: String, default: "" },
  synced_at: { type: Date },
  posted_ledger_at: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model("MisaFinanceSync", MisaFinanceSyncSchema);
