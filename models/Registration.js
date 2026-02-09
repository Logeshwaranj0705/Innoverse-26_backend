import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    role: String,
    name: String,
    clg: String,
    email: String,
    mobile: String,
    gender: String,
    degree: String,
    year: String,
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema({
  event: { type: String, default: "INNOVERSE 26" },
  teamName: { type: String, required: true, unique: true },
  teamSize: { type: Number, required: true },
  members: { type: [memberSchema], required: true },
  transactionId: { type: String, required: true },
  paymentImage: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Registration", registrationSchema);
