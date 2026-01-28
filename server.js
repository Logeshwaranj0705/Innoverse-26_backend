import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import XLSX from "xlsx";
import Registration from "./models/Registration.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

mongoose
  .connect(
    "mongodb+srv://innoverse:innoverse-26@innoverse26.9olhwkm.mongodb.net/",
    { dbName: "innoverse" }
  )
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);


app.post("/register", async (req, res) => {
  try {
    const { teamName, members, transactionId, paymentImage } = req.body;

    if (!teamName || !members || !transactionId || !paymentImage) {
      return res.status(400).json({ error: "missing fields" });
    }

    const exists = await Registration.findOne({ teamName });
    if (exists) {
      return res.status(409).json({ error: "team exists" });
    }

    const doc = await Registration.create({
      teamName,
      members,
      transactionId,
      paymentImage
    });

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: "server error" });
  }
});

app.get("/payment-image/:id", async (req, res) => {
  try {
    const record = await Registration.findById(req.params.id).lean();
    if (!record || !record.paymentImage) {
      return res.status(404).send("Image not found");
    }


    const [meta, base64Data] = record.paymentImage.split(",");
    const mime = meta.match(/data:(.*);base64/)[1];

    const buffer = Buffer.from(base64Data, "base64");

    res.setHeader("Content-Type", mime);
    res.send(buffer);
  } catch (err) {
    res.status(500).send("Error loading image");
  }
});

app.use("/export", (req, res, next) => {
  if (req.headers["x-admin-key"] !== "innoverse-secret-key") {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.get("/export/xls", async (req, res) => {
  try {
    const data = await Registration.find().lean();

    const rows = data.map((item, i) => {
      const row = {
        sno: i + 1,
        teamName: item.teamName,
        transactionId: item.transactionId,
        paymentImageUrl: `http://localhost:5000/payment-image/${item._id}`
      };

      item.members.forEach((m, idx) => {
        row[`member${idx + 1}_name`] = m.name;
        row[`member${idx + 1}_mobile`] = m.mobile;
        row[`member${idx + 1}_email`] = m.email;
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");

    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx"
    });

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
    res.status(500).json({ error: "export failed" });
  }
});

app.listen(5000, () => console.log("server running on 5000"));
