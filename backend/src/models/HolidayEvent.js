import mongoose from "mongoose";

const HolidayEventSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    start_date: { type: Date, required: true }, 
    end_date: { type: Date, required: true },   
    back_to_work_date: { type: Date },          

    notify_advance_days: {
      type: Number,
      default: 2,
      min: 0,
    }, 

    announcement_template: {
      type: String,
      trim: true,
    },

    wish_template: {
      type: String,
      trim: true,
    },

    is_notified: { type: Boolean, default: false }, 
    is_wished: { type: Boolean, default: false },   

    notified_at: { type: Date, default: null },   
    wished_at: { type: Date, default: null },     
    notified_count: { type: Number, default: 0 }, 
    wished_count: { type: Number, default: 0 },   

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

HolidayEventSchema.index({ company: 1, start_date: 1 });
HolidayEventSchema.index({ company: 1, is_notified: 1 });
HolidayEventSchema.index({ company: 1, is_wished: 1 });

export default mongoose.model("HolidayEvent", HolidayEventSchema);
