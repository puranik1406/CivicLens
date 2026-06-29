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

const DISTRICTS = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "San Francisco",
];

const normalizeText = (value?: string) => (value || "").toLowerCase().replace(/&/g, "and");

function departmentsMatch(reportDepartment?: string, officerDepartment?: string) {
  const report = normalizeText(reportDepartment);
  const officer = normalizeText(officerDepartment);

  if (!report || !officer) return false;
  if (report === officer || report.includes(officer) || officer.includes(report)) return true;

  const aliases: Record<string, string[]> = {
    "roads department": ["department of transportation", "transportation", "road", "pothole"],
    "water and sanitation": ["water department", "water", "sanitation", "sewer"],
    "electricity department": ["electricity", "streetlight", "power"],
    "parks and recreation": ["parks and recreation", "parks", "recreation"],
    "public works": ["department of public works", "public works"],
    "health and safety": ["health", "safety", "public hazard"],
    "traffic management": ["traffic", "signage", "transportation"],
  };

  return (aliases[officer] || []).some((alias) => report.includes(alias) || normalizeText(alias).includes(report));
}

function inferDistrict(address?: string) {
  const normalizedAddress = normalizeText(address);
  const matchedDistrict = DISTRICTS.find((district) => normalizedAddress.includes(normalizeText(district)));
  return matchedDistrict || "Hyderabad";
}

function getRequestScope(req: express.Request) {
  return {
    role: String(req.header("x-civiclens-role") || req.query.role || ""),
    district: String(req.header("x-civiclens-district") || req.query.district || ""),
    department: String(req.header("x-civiclens-department") || req.query.department || ""),
  };
}

function reportInOfficerScope(report: any, scope: ReturnType<typeof getRequestScope>) {
  return (
    normalizeText(report.district) === normalizeText(scope.district) &&
    departmentsMatch(report.suggested_department, scope.department)
  );
}

async function reverseGeocodeCoordinates(lat: number, lng: number) {
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${encodeURIComponent(googleApiKey)}`;
    const googleRes = await fetch(googleUrl);
    const data = await googleRes.json();
    const result = data.results?.[0] || {};
    const address = result.formatted_address || "";
    const components = result.address_components || [];
    const lookup = Object.fromEntries(components.map((comp: any) => comp.types.map((type: string) => [type, comp.long_name])).flat(2));
    return {
      address,
      area: lookup.neighborhood || lookup.sublocality || lookup.route || lookup.locality || "",
      ward: lookup.ward || lookup.administrative_area_level_3 || "",
      district: lookup.administrative_area_level_2 || lookup.administrative_area_level_1 || "",
      city: lookup.locality || lookup.postal_town || lookup.administrative_area_level_3 || "",
      state: lookup.administrative_area_level_1 || "",
      pincode: lookup.postal_code || "",
      lat,
      lng,
    };
  }

  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
  const nominatimRes = await fetch(nominatimUrl, {
    headers: { "User-Agent": "CivicLens/1.0" },
  });
  const json = await nominatimRes.json();
  const location = json.address || {};
  const display = json.display_name || "";
  return {
    address: display,
    area: location.neighbourhood || location.suburb || location.village || location.hamlet || location.road || "",
    ward: location.ward || location.suburb || location.neighbourhood || "",
    district: location.county || location.state_district || location.administrative_area_level_2 || location.city_district || "",
    city: location.city || location.town || location.village || location.municipality || "",
    state: location.state || location.region || "",
    pincode: location.postcode || "",
    lat,
    lng,
  };
}

async function getReportsForScope(req: express.Request) {
  const scope = getRequestScope(req);
  const reports = await db.all("SELECT * FROM reports ORDER BY upload_timestamp DESC");

  if (scope.role === "officer") {
    if (!scope.district || !scope.department) {
      return { status: 403, error: "Officer district and department scope are required." };
    }
    return { reports: reports.filter((report) => reportInOfficerScope(report, scope)) };
  }

  return { reports };
}

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
      district TEXT NOT NULL DEFAULT 'Hyderabad',
      address TEXT,
      area TEXT,
      ward TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      lat REAL,
      lng REAL,
      assigned_officer TEXT,
      officer_notes TEXT,
      resolved_at TEXT,
      resolution_time_minutes INTEGER
    )
  `);

  const columns = await db.all("PRAGMA table_info(reports)");
  const hasDistrict = columns.some((column: any) => column.name === "district");
  if (!hasDistrict) {
    await db.exec("ALTER TABLE reports ADD COLUMN district TEXT NOT NULL DEFAULT 'Hyderabad'");
  }

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (!columns.some((column: any) => column.name === columnName)) {
      await db.exec(`ALTER TABLE reports ADD COLUMN ${columnName} ${definition}`);
    }
  };

  await addColumnIfMissing("area", "TEXT");
  await addColumnIfMissing("ward", "TEXT");
  await addColumnIfMissing("city", "TEXT");
  await addColumnIfMissing("state", "TEXT");
  await addColumnIfMissing("pincode", "TEXT");
  await addColumnIfMissing("assigned_officer", "TEXT");
  await addColumnIfMissing("officer_notes", "TEXT");
  await addColumnIfMissing("resolved_at", "TEXT");
  await addColumnIfMissing("resolution_time_minutes", "INTEGER");

  await db.run(`
    UPDATE reports
    SET district = CASE
      WHEN report_id = 'seed-1' THEN 'Hyderabad'
      WHEN report_id = 'seed-2' THEN 'Bengaluru'
      WHEN report_id = 'seed-3' THEN 'Hyderabad'
      WHEN LOWER(COALESCE(address, '')) LIKE '%san francisco%' THEN 'San Francisco'
      ELSE district
    END
    WHERE district IS NULL OR district = '' OR report_id IN ('seed-1', 'seed-2', 'seed-3')
  `);

  // Seed with mock records if database is empty
  const countRes = await db.get("SELECT COUNT(*) as count FROM reports");
  if (countRes && countRes.count === 0) {
    console.log("Seeding initial civic reports database...");
    const seedReports: Array<any> = [
      {
        report_id: "seed-1",
        image_path: "https://images.unsplash.com/photo-1597482504938-3f59196d4824?auto=format&fit=crop&q=80&w=600",
        upload_timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
        issue_category: "Pothole & Road Damage",
        description: "Large, deep pothole in the middle lane causing vehicles to swerve dangerously. Located near a school zone, posing immediate safety risks to buses and children.",
        severity: "High",
        suggested_department: "Department of Transportation",
        district: "Hyderabad",
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
        district: "Bengaluru",
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
        district: "Hyderabad",
        gemini_response: JSON.stringify({ issue_category: "Illegal Trash Dumping", severity: "Medium" }),
        status: "Resolved",
        address: "Greenwood Park North Entrance",
        lat: 37.7801,
        lng: -122.4192,
      },
    ];

    for (const report of seedReports) {
      await db.run(
        `INSERT INTO reports (report_id, image_path, upload_timestamp, issue_category, description, severity, suggested_department, district, gemini_response, status, address, area, ward, city, state, pincode, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.report_id,
          report.image_path,
          report.upload_timestamp,
          report.issue_category,
          report.description,
          report.severity,
          report.suggested_department,
          report.district,
          report.gemini_response,
          report.status,
          report.address,
          report.area || null,
          report.ward || null,
          report.city || null,
          report.state || null,
          report.pincode || null,
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
      "recommend the municipal department to handle it, choose the responsible district from Hyderabad, Bengaluru, Chennai, Mumbai, Delhi, Pune, Kolkata, Ahmedabad, or San Francisco, and give a realistic street address or location description plus simulated geographic coordinates for that district.",
  };

  let response;
  const maxRetries = 3;
  let delay = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
              district: {
                type: Type.STRING,
                description: "The municipal district responsible for the issue. Choose one of: Hyderabad, Bengaluru, Chennai, Mumbai, Delhi, Pune, Kolkata, Ahmedabad, San Francisco.",
              },
              address: {
                type: Type.STRING,
                description: "A realistic street address or location description based on the selected district and scene context.",
              },
              lat: {
                type: Type.NUMBER,
                description: "A realistic latitude value for the selected district.",
              },
              lng: {
                type: Type.NUMBER,
                description: "A realistic longitude value for the selected district.",
              },
            },
            required: ["issue_category", "description", "severity", "suggested_department", "district", "address", "lat", "lng"],
          },
        },
      });
      break;
    } catch (apiError: any) {
      console.warn(`Gemini API attempt ${attempt} failed:`, apiError.message || apiError);
      if (attempt === maxRetries) {
        throw apiError;
      }
      const errStr = String(apiError.message || apiError);
      if (
        errStr.includes("503") ||
        errStr.includes("429") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("ResourceExhausted") ||
        errStr.includes("high demand")
      ) {
        console.log(`Retriable error encountered. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw apiError;
      }
    }
  }

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
    const result = await getReportsForScope(req);
    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.reports);
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
    const scope = getRequestScope(req);
    if (scope.role === "officer" && !reportInOfficerScope(report, scope)) {
      return res.status(403).json({ error: "This report is outside the officer's assigned district and department." });
    }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch report detail.", details: error.message });
  }
});

// Reverse geocode current coordinates
app.post("/api/location/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Latitude and longitude are required as numbers." });
    }
    const location = await reverseGeocodeCoordinates(lat, lng);
    res.json(location);
  } catch (error: any) {
    res.status(500).json({ error: "Unable to resolve location.", details: error.message });
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
    let analysis: any;
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

    const requestLat = typeof req.body.lat === "string" ? parseFloat(req.body.lat) : req.body.lat;
    const requestLng = typeof req.body.lng === "string" ? parseFloat(req.body.lng) : req.body.lng;
    const area = req.body.area || analysis.area || "";
    const ward = req.body.ward || analysis.ward || "";
    const city = req.body.city || analysis.city || "";
    const stateValue = req.body.state || analysis.state || "";
    const pincode = req.body.pincode || analysis.pincode || "";
    const addressValue = req.body.address || analysis.address || "";
    const district = req.body.district || (DISTRICTS.includes(analysis.district) ? analysis.district : inferDistrict(addressValue));

    await db.run(
      `INSERT INTO reports (report_id, image_path, upload_timestamp, issue_category, description, severity, suggested_department, district, gemini_response, status, address, area, ward, city, state, pincode, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report_id,
        imagePathRelative,
        timestamp,
        analysis.issue_category,
        analysis.description,
        analysis.severity,
        analysis.suggested_department,
        district,
        JSON.stringify({ ...analysis, district }),
        "Pending",
        addressValue,
        area,
        ward,
        city,
        stateValue,
        pincode,
        requestLat,
        requestLng,
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
    const { status, assigned_officer, officer_notes, resolved_at, resolution_time_minutes } = req.body;

    if (typeof status !== "undefined" && !["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Status must be Pending, In Progress, or Resolved." });
    }

    const report = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    const scope = getRequestScope(req);
    if (scope.role === "officer" && !reportInOfficerScope(report, scope)) {
      return res.status(403).json({ error: "This report is outside the officer's assigned district and department." });
    }

    const updates: Array<{ column: string; value: any }> = [];
    if (typeof status !== "undefined") updates.push({ column: "status", value: status });
    if (typeof assigned_officer !== "undefined") updates.push({ column: "assigned_officer", value: assigned_officer });
    if (typeof officer_notes !== "undefined") updates.push({ column: "officer_notes", value: officer_notes });
    if (typeof resolved_at !== "undefined") updates.push({ column: "resolved_at", value: resolved_at });
    if (typeof resolution_time_minutes !== "undefined") updates.push({ column: "resolution_time_minutes", value: resolution_time_minutes });

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid report updates were supplied." });
    }

    const setClause = updates.map((update) => `${update.column} = ?`).join(", ");
    const values = updates.map((update) => update.value);
    await db.run(`UPDATE reports SET ${setClause} WHERE report_id = ?`, [...values, req.params.id]);

    const updatedReport = await db.get("SELECT * FROM reports WHERE report_id = ?", [req.params.id]);
    res.json(updatedReport);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update report.", details: error.message });
  }
});

// Delete a report
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const scope = getRequestScope(req);
    if (scope.role !== "superadmin") {
      return res.status(403).json({ error: "Only super admins can delete reports." });
    }

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
