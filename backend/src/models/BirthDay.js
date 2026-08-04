import mongoose from "mongoose";

const birthdaySchema = new mongoose.Schema({
    birthDayWish : {
        type: String,
        required: true
    },
    gender : {
        type: String,
        required: true,
        enum: ["male", "female", "other"],
        default: "male"
    },

}, { timestamps: true });

export default mongoose.model("BirthDay", birthdaySchema);
