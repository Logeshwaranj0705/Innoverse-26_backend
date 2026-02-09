  import express from "express";
  import mongoose from "mongoose";
  import cors from "cors";
  import XLSX from "xlsx";

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "20mb" }));

  // ✅ MongoDB connect
  mongoose
    .connect(
      "mongodb+srv://innoverse:innoverse-26@innoverse26.9olhwkm.mongodb.net/",
      { dbName: "innoverse" }
    )
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

  // ✅ UPDATED SCHEMA (stores ALL fields)
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

  const Registration = mongoose.model("Registration", registrationSchema);

  app.get("/health", (req, res) => res.json({ ok: true }));

  // ✅ REGISTER (stores everything, prevents undefined)
  app.post("/register", async (req, res) => {
    try {
      const {
        event,
        teamName,
        teamSize,
        members,
        transactionId,
        paymentImage,
        submittedAt,
      } = req.body;

      if (
        !teamName ||
        !teamSize ||
        !Array.isArray(members) ||
        members.length === 0 ||
        !transactionId ||
        !paymentImage
      ) {
        return res.status(400).json({ success: false, error: "missing fields" });
      }

      const exists = await Registration.findOne({ teamName }).lean();
      if (exists) {
        return res.status(409).json({ success: false, error: "team exists" });
      }

      const cleanedMembers = members.map((m, i) => ({
        role: m?.role || (i === 0 ? "Leader" : `Member ${i}`),
        name: String(m?.name || "").trim(),
        clg: String(m?.clg || "").trim(),
        email: String(m?.email || "").trim(),
        mobile: String(m?.mobile || "").trim(),
        gender: String(m?.gender || "").trim(),
        degree: String(m?.degree || "").trim(),
        year: String(m?.year || "").trim(),
      }));

      const doc = await Registration.create({
        event: event || "INNOVERSE 26",
        teamName: String(teamName).trim(),
        teamSize: Number(teamSize),
        members: cleanedMembers,
        transactionId: String(transactionId).trim(),
        paymentImage,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      });

      return res.json({ success: true, data: doc });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, error: err?.message || "server error" });
    }
  });

  // ✅ VIEW PAYMENT IMAGE
  app.get("/payment-image/:id", async (req, res) => {
    try {
      const record = await Registration.findById(req.params.id).lean();
      if (!record || !record.paymentImage) {
        return res.status(404).send("Image not found");
      }

      const parts = String(record.paymentImage).split(",");
      if (parts.length < 2) return res.status(400).send("Invalid image data");

      const meta = parts[0];
      const base64Data = parts.slice(1).join(",");
      const match = meta.match(/data:(.*);base64/);

      if (!match?.[1]) return res.status(400).send("Invalid image mime");

      const mime = match[1];
      const buffer = Buffer.from(base64Data, "base64");

      res.setHeader("Content-Type", mime);
      res.send(buffer);
    } catch (err) {
      res.status(500).send("Error loading image");
    }
  });

  // ✅ ADMIN EXPORT PROTECTION
  app.use("/export", (req, res, next) => {
    if (req.headers["x-admin-key"] !== "innoverse-secret-key") {
      return res.status(401).json({ success: false, error: "unauthorized" });
    }
    next();
  });

  // ✅ EXPORT XLS WITH ALL MEMBER DATA
  app.get("/export/xls", async (req, res) => {
    try {
      const data = await Registration.find().sort({ submittedAt: -1 }).lean();

      const rows = data.map((item, i) => {
        const row = {
          sno: i + 1,
          event: item.event,
          teamName: item.teamName,
          teamSize: item.teamSize,
          transactionId: item.transactionId,
          submittedAt: item.submittedAt,
          paymentImageUrl: `https://innoverse-26-backend.onrender.com/payment-image/${item._id}`,
        };

        (item.members || []).forEach((m, idx) => {
          const n = idx + 1;
          row[`member${n}_role`] = m.role || "";
          row[`member${n}_name`] = m.name || "";
          row[`member${n}_clg`] = m.clg || "";
          row[`member${n}_email`] = m.email || "";
          row[`member${n}_mobile`] = m.mobile || "";
          row[`member${n}_gender`] = m.gender || "";
          row[`member${n}_degree`] = m.degree || "";
          row[`member${n}_year`] = m.year || "";
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=innoverse.xlsx"
      );

      res.end(buffer);
    } catch (err) {
      res.status(500).json({ success: false, error: "export failed" });
    }
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`server running on ${PORT}`));
