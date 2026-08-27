import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDeletePlugin.js";
import auditLogPlugin from "../utils/auditLogPlugin.js";
const WorkHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["transfer", "promotion", "demotion", "appointment", "adjustment"],
      required: true,
    },
    fromDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    toDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    fromPosition: { type: mongoose.Schema.Types.ObjectId, ref: "Position" },
    toPosition: { type: mongoose.Schema.Types.ObjectId, ref: "Position" },
    fromSalary: { type: Number },
    toSalary: { type: Number },
    effectiveDate: { type: Date, required: true },
    decisionNo: { type: String },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, _id: true }
);

const DependentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  relationship: {
    type: String,
    enum: ["spouse", "child", "parent", "sibling", "other"],
    default: "child",
  },
  birthday: { type: Date },
  nationalId: { type: String },
  taxCode: { type: String },
  fromDate: { type: Date },
  toDate: { type: Date },
  note: { type: String },
});

const BankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  bankBranch: { type: String },
  accountNumber: { type: String, required: true },
  accountName: { type: String },
  isPrimary: { type: Boolean, default: true },
});

const EmployeeSchema = new mongoose.Schema(
  {
    empCode: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["Pre-Onboarding", "active", "probation", "maternity-leave", "inactive", "terminated"],
      default: "active",
    },

    fullName: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    birthday: { type: Date },
    placeOfBirth: { type: String, trim: true },
    nationality: { type: String, default: "Việt Nam" },
    ethnicity: { type: String, default: "Kinh" },
    religion: { type: String, default: "Không" },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced"],
      default: "single",
    },

    nationalId: { type: String, trim: true },
    nationalIdIssuedDate: { type: Date },
    nationalIdIssuedPlace: { type: String, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    personalEmail: { type: String, default: "" },
    permanentAddress: { type: String, trim: true },
    currentAddress: { type: String, trim: true },

    educationLevel: {
      type: String,
      enum: ["high-school", "college", "university", "master", "phd", "other"],
      default: "university",
    },
    major: { type: String, trim: true },
    graduatedSchool: { type: String, trim: true },
    graduatedYear: { type: Number },

    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    position: { type: mongoose.Schema.Types.ObjectId, ref: "Position" },
    positionName: { type: String },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    startDate: { type: Date },
    officialDate: { type: Date },
    seniority: { type: Number, default: 0 },
    workLocation: { type: String, trim: true },
    contractType: {
      type: String,
      enum: ["probation", "fixed-term", "indefinite"],
      default: "fixed-term",
    },
    contractNo: { type: String, trim: true },
    contractStartDate: { type: Date },
    endDateOfContract: { type: Date },
    contractScan: { type: String },
    salary: { type: Number, default: 0 },
    salaryGrade: { type: String, trim: true },
    salaryCoefficient: { type: Number, default: 1 },
    allowances: { type: Number, default: 0 },
    taxCode: { type: String, trim: true },
    socialInsuranceNo: { type: String, trim: true },
    healthInsuranceNo: { type: String, trim: true },
    socialInsuranceDate: { type: Date },
    bankAccounts: { type: [BankAccountSchema], default: [] },

    dependents: { type: [DependentSchema], default: [] },

    workHistory: { type: [WorkHistorySchema], default: [] },

    avatar: { type: String },
    note: { type: String, default: "" },

    // ── Phase 2: Attendance & FaceID ──────────────────────────────
    // Ca làm việc mặc định (có thể override bằng WorkScheduleAssignment)
    defaultShift: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftTemplate", default: null },
    // Face embedding vector 128-dim từ face-api.js FaceRecognitionNet
    faceEmbedding: { type: [Number], default: [] },
    faceRegisteredAt: { type: Date, default: null },
    // Ảnh đại diện dùng cho chấm công (khác avatar)
    faceImageUrl: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },

    // ── Onboarding Zalo ────────────────────────────────────────
    onboardingZaloSent:   { type: Boolean, default: false },
    onboardingZaloSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmployeeSchema.index({ fullName: "text" });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ position: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ endDateOfContract: 1 });
EmployeeSchema.index({ deletedAt: 1 });
EmployeeSchema.index({ defaultShift: 1 });
EmployeeSchema.index({ faceRegisteredAt: 1 });

EmployeeSchema.index({ birthday: 1 });

EmployeeSchema.plugin(softDeletePlugin);
EmployeeSchema.plugin(auditLogPlugin);

export default mongoose.model("Employee", EmployeeSchema);
