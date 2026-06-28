import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Body parsing middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure uploads directory
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `issue-${uniqueSuffix}${ext}`);
  },
});

// Validate image file types
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images (.jpg, .jpeg, .png, .webp) are allowed!"));
    }
  },
});

// Database Initialization
let db: Database<sqlite3.Database, sqlite3.Statement>;

async function initDb() {
  db = await open({
    filename: path.join(process.cwd(), "civiclens.db"),
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      image_path TEXT NOT NULL,
      upload_timestamp TEXT NOT NULL,
      issue_category TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      suggested_department TEXT NOT NULL,
      gemini_response TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      address TEXT,
      lat REAL,
      lng REAL
    )
  `);

  // Seed with mock records if database is empty
  const countRes = await db.get("SELECT COUNT(*) as count FROM reports");
  if (countRes && countRes.count === 0) {
    console.log("Seeding initial civic reports database...");
    const seedReports = [
      {
        report_id: "seed-1",
        image_path: "https://images.unsplash.com/photo-1597482504938-3f59196d4824?auto=format&fit=crop&q=80&w=600",
        upload_timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
        issue_category: "Pothole & Road Damage",
        description: "Large, deep pothole in the middle lane causing vehicles to swerve dangerously. Located near a school zone, posing immediate safety risks to buses and children.",
        severity: "High",
        suggested_department: "Department of Transportation",
        gemini_response: JSON.stringify({ issue_category: "Pothole & Road Damage", severity: "High" }),
        status: "In Progress",
        address: "415 Pine Street, Downtown",
        lat: 37.7892,
        lng: -122.4014,
      },
      {
        report_id: "seed-2",
        image_path: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
        upload_timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
        issue_category: "Water Leak",
        description: "Water main rupture on the sidewalk resulting in thousands of gallons of clean municipal water flooding the street curb. Pedestrian crossing is completely submerged.",
        severity: "Critical",
        suggested_department: "Water Department",
        gemini_response: JSON.stringify({ issue_category: "Water Leak", severity: "Critical" }),
        status: "Pending",
        address: "1082 Oak Avenue, Lakeside",
        lat: 37.7948,
        lng: -122.3965,
      },
      {
        report_id: "seed-3",
        image_path: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
        upload_timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 days ago
        issue_category: "Illegal Trash Dumping",
        description: "Heaps of furniture, old computer monitors, and household garbage piled up next to the public park recycling bins. Attracting rodents and blocking the cycle lane.",
        severity: "Medium",
        suggested_department: "Sanitation Department",
        gemini_response: JSON.stringify({ issue_category: "Illegal Trash Dumping", severity: "Medium" }),
        status: "Resolved",
        address: "Greenwood Park North Entrance",
        lat: 37.7801,
        lng: -122.4192,
      },
    ];

    for (const report of seedReports) {
      await db.run(
        `INSERT INTO reports (report_id, image_path, upload_timestamp, issue_category, description, severity, suggested_department, gemini_response, status, address, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.report_id,
          report.image_path,
          report.upload_timestamp,
          report.issue_category,
          report.description,
          report.severity,
          report.suggested_department,
          report.gemini_response,
          report.status,
          report.address,
          report.lat,
          report.lng,
        ]
      );
    }
  }
}

// Lazy Gemini Client initialization & prompt analyzer
async function analyzeCivicImage(imageBuffer: Buffer, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required. Please add it via Settings > Secrets.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const base64Data = imageBuffer.toString("base64");

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: "You are CivicLens AI, a municipal infrastructure inspection system. Analyze this image of a civic/infrastructure issue. " +
      "Identify the type of civic issue, describe it clearly, rate its severity (Low, Medium, High, Critical), " +
      "recommend the municipal department to handle it, and give a realistic street address (or location description) plus simulated geographic coordinates (latitude/longitude) in San Francisco, CA where this photo looks like it could be from (latitude between 37.70 and 37.82, longitude between -122.52 and -122.36).",
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          issue_category: {
            type: Type.STRING,
            description: "Broad category (e.g. Pothole & Road Damage, Water Leak, Illegal Trash Dumping, Broken Streetlight, Graffiti & Vandalism, Damaged Signage, Public Hazard).",
          },
          description: {
            type: Type.STRING,
            description: "Detailed description of the observed civic/infrastructure issue, highlighting hazards or details.",
          },
          severity: {
            type: Type.STRING,
            description: "The priority severity level: 'Low', 'Medium', 'High', or 'Critical'.",
          },
          suggested_department: {
            type: Type.STRING,
            description: "The best municipal department to handle this (e.g., Department of Transportation, Water Department, Sanitation Department, Parks & Recreation, Department of Public Works).",
          },
          address: {
            type: Type.STRING,
            description: "A realistic street address or location description based on the scene context (e.g., '1450 Geary Blvd, San Francisco').",
          },
          lat: {
            type: Type.NUMBER,
            description: "A realistic latitude value in San Francisco (between 37.70 and 37.82).",
          },
          lng: {
            type: Type.NUMBER,
            description: "A realistic longitude value in San Francisco (between -122.52 and -122.36).",
          },
        },
        required: ["issue_category", "description", "severity", "suggested_department", "address", "lat", "lng"],
      },
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("No response received from the Gemini API.");
  }

  return JSON.parse(responseText.trim());
}

// API Routes

// Get all reports
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await db.all("SELECT * FROM reports ORDER BY upload_timestamp DESC");
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch reports from SQLite.", details: error.message });
  }
});

// Get a single report by ID
app.get("/api/reports/:id", async (req, res) => {
  try {
    const report = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch report detail.", details: error.message });
  }
});

// Upload and analyze image
app.post("/api/reports/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    // Read file buffer for Gemini
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = req.file.mimetype;

    // Analyze via Gemini
    let analysis;
    try {
      analysis = await analyzeCivicImage(fileBuffer, mimeType);
    } catch (apiError: any) {
      // If Gemini fails (e.g. no API key or rate limit), we delete the uploaded file and return structured error
      fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Gemini AI Analysis Failed",
        message: apiError.message,
      });
    }

    // Save report to SQLite
    const report_id = "rep-" + Date.now() + "-" + Math.round(Math.random() * 1000);
    const imagePathRelative = `/uploads/${req.file.filename}`;
    const timestamp = new Date().toISOString();

    await db.run(
      `INSERT INTO reports (report_id, image_path, upload_timestamp, issue_category, description, severity, suggested_department, gemini_response, status, address, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report_id,
        imagePathRelative,
        timestamp,
        analysis.issue_category,
        analysis.description,
        analysis.severity,
        analysis.suggested_department,
        JSON.stringify(analysis),
        "Pending", // New reports start as Pending
        analysis.address,
        analysis.lat,
        analysis.lng,
      ]
    );

    const savedReport = await db.get("SELECT * FROM reports WHERE report_id = ?", [report_id]);
    res.status(201).json(savedReport);
  } catch (error: any) {
    res.status(500).json({ error: "An unexpected error occurred while processing.", details: error.message });
  }
});

// Update report status (e.g., 'Pending', 'In Progress', 'Resolved')
app.patch("/api/reports/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status value is required." });
    }

    const report = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }

    await db.run("UPDATE reports SET status = ? WHERE report_id = ?", [status, req.params.id]);
    const updatedReport = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    res.json(updatedReport);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update report status.", details: error.message });
  }
});

// Delete a report
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const report = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }

    // If it's a local file (not a seed Unsplash URL), delete the image file from disk
    if (report.image_path.startsWith("/uploads/")) {
      const fullImagePath = path.join(process.cwd(), report.image_path);
      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
      }
    }

    await db.run("DELETE FROM reports WHERE report_id = ?", [req.params.id]);
    res.json({ message: "Report deleted successfully.", report_id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete report.", details: error.message });
  }
});

// Main server start routine with Vite dev middleware
async function startServer() {
  await initDb();

  // Mount Vite middleware for development or serve static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicLens server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CivicLens server:", err);
});
