import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String
});

const registrationSchema = new mongoose.Schema({
  teamName: String,
  members: [memberSchema],
  transactionId: String,
  paymentImage: String,
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Registration", registrationSchema);
