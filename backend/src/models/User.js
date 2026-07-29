import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true,trim: true, lowercase: true },
    password: { type: String, required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
    roleCode: {
      type: String,
      enum: ["super-admin", "hr-admin", "manager", "employee", "viewer"],
      default: "employee",
    },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ deletedAt: 1 });

export default mongoose.model("User", UserSchema);
