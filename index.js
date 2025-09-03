const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

// AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to upload single photo
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Unique filename
    const fileName = `jaromjery/profilePics/${crypto.randomUUID()}${path.extname(req.file.originalname)}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const photoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save to database
    const newUser = await prisma.user.create({
      data: { name, email, photoUrl },
    });

    res.json({ message: "Upload successful", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

