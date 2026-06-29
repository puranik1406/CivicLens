import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  Clock,
  Compass,
  ArrowLeft,
  Calendar,
  Layers,
  Activity,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";
import {
  getSeverityBadgeClass,
  getStatusBadgeClass,
  getEstimatedTime,
  formatDateTime,
} from "../../utils/reportHelpers";

const STEPPER_MESSAGES = [
  "Analyzing image structure & exposure...",
  "Consulting Gemini AI vision model...",
  "Extracting issue details & civic category...",
  "Determining priority level & severity...",
  "Routing to responsible municipal department...",
  "Generating public safety coordinate pin...",
  "Creating SQLite ledger ticket..."
];

const ReportIssue: React.FC = () => {
  const { user } = useAuth();

  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Report | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "detecting" | "ready" | "failed">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [locationWard, setLocationWard] = useState("");
  const [locationDistrict, setLocationDistrict] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationPincode, setLocationPincode] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      setAnalyzingStep(0);
      interval = setInterval(() => {
        setAnalyzingStep((prev) => {
          if (prev < STEPPER_MESSAGES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files (.png, .jpg, .jpeg, .webp) are supported.");
      return;
    }
    setUploadError(null);
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setAnalysisResult(null);
  };

  const triggerUpload = async () => {
    if (!uploadFile) return;

    if (locationLat === null || locationLng === null) {
      setUploadError("Please detect and verify your location before submitting.");
      return;
    }

    if (!locationDistrict && !locationCity && !locationState && !locationArea && !locationWard) {
      setUploadError("Please confirm the detected location fields before submission.");
      return;
    }

    setAnalyzing(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("image", uploadFile);
    formData.append("lat", String(locationLat));
    formData.append("lng", String(locationLng));
    formData.append("address", locationAddress);
    formData.append("area", locationArea);
    formData.append("ward", locationWard);
    formData.append("city", locationCity);
    formData.append("state", locationState);
    formData.append("pincode", locationPincode);
    formData.append("district", locationDistrict || locationCity || locationState || "");

    try {
      const res = await fetch("/api/reports/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Analysis failed.");
      }

      setAnalysisResult(data);

      // Track this user's submitted report locally so we can filter by logged in user
      const existing: string[] = JSON.parse(
        localStorage.getItem(`civiclens_my_reports_${user?.id}`) ?? "[]"
      );
      if (!existing.includes(data.report_id)) {
        existing.push(data.report_id);
        localStorage.setItem(`civiclens_my_reports_${user?.id}`, JSON.stringify(existing));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "An error occurred during Gemini processing.");
    } finally {
      setAnalyzing(false);
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationStatus("failed");
      return;
    }

    setLocationStatus("detecting");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setLocationLat(latitude);
          setLocationLng(longitude);

          const res = await fetch("/api/location/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Reverse geocoding failed.");
          }

          const data = await res.json();
          setLocationAddress(data.address || "");
          setLocationArea(data.area || "");
          setLocationWard(data.ward || "");
          setLocationDistrict(data.district || "");
          setLocationCity(data.city || "");
          setLocationState(data.state || "");
          setLocationPincode(data.pincode || "");
          setLocationStatus("ready");
        } catch (geocodeError: any) {
          console.error("Location lookup failed:", geocodeError);
          setLocationError(geocodeError.message || "Failed to resolve current location.");
          setLocationStatus("failed");
        }
      },
      (positionError) => {
        console.error("Geolocation error:", positionError);
        setLocationError(positionError.message || "Unable to access location.");
        setLocationStatus("failed");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
    );
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setAnalysisResult(null);
    setUploadError(null);
    setAnalyzingStep(0);
    setLocationStatus("idle");
    setLocationError(null);
    setLocationLat(null);
    setLocationLng(null);
    setLocationAddress("");
    setLocationArea("");
    setLocationWard("");
    setLocationDistrict("");
    setLocationCity("");
    setLocationState("");
    setLocationPincode("");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e1e1e6] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <div className="bg-[#38bdf8]/10 border border-[#38bdf8]/20 p-3 rounded-2xl">
            <Sparkles className="h-6 w-6 text-[#38bdf8]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e1e1e6]">File a Civic Issue</h2>
            <p className="text-xs text-[#52525b]">Upload a photo of the concern to trigger instant Gemini AI classification & routing</p>
          </div>
        </div>

        <div className="relative">
        <AnimatePresence mode="wait">
          {!uploadPreview ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[350px] ${
                dragActive
                  ? "border-[#38bdf8] bg-[#152535]/30 text-[#38bdf8]"
                  : "border-[#26262d] bg-[#111114] hover:border-[#38bdf8]/40 hover:bg-[#141417]/80 text-[#94949e]"
              }`}
            >
              <input
                id="citizen-image-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="bg-[#18181c] border border-[#26262d] text-[#38bdf8] p-4 rounded-2xl shadow-lg mb-4 group-hover:scale-105 transition-transform">
                <UploadCloud className="h-10 w-10 stroke-[1.5]" />
              </div>
              <h3 className="font-bold text-[#e1e1e6] text-base">Drag & drop your image here</h3>
              <p className="text-xs text-[#52525b] mt-1.5">Supports JPG, PNG, WEBP up to 10MB</p>
              <button
                type="button"
                className="mt-6 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/20 text-[#38bdf8] font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Browse Files
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="preview-flow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-[#111114] border border-[#26262d] rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 min-h-[450px]"
            >
              {/* Image side */}
              <div className="bg-[#070709] relative flex items-center justify-center min-h-[320px] p-4 border-r border-[#26262d]">
                <img
                  src={uploadPreview}
                  alt="Incident Preview"
                  className="max-h-[420px] w-full object-contain rounded-2xl"
                />

                {/* Loading overlay */}
                {analyzing && (
                  <div className="absolute inset-0 bg-[#0a0a0be0] backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_20px_#38bdf8] top-1/3 animate-bounce" />
                    <div className="bg-[#111114] border border-[#26262d] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative z-10">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#38bdf8] border-t-transparent" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#38bdf8] tracking-widest block">AI Vision Dispatch</span>
                        <h4 className="font-extrabold text-sm text-[#e1e1e6] mt-1">Analyzing Scene Context</h4>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs text-[#94949e] font-medium truncate">
                          {STEPPER_MESSAGES[analyzingStep]}
                        </div>
                        <div className="h-1.5 bg-[#18181c] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#38bdf8] transition-all duration-500 rounded-full"
                            style={{ width: `${((analyzingStep + 1) / STEPPER_MESSAGES.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel button before submit */}
                {!analyzing && !analysisResult && (
                  <button
                    onClick={resetUploadState}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full cursor-pointer transition-colors border border-[#26262d]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Data / Submit side */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                {/* 1. Pending Submit */}
                {!analyzing && !analysisResult && !uploadError && (
                  <div className="flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-5">
                      <div className="bg-[#1b253b] border border-[#38bdf8]/20 p-4 rounded-2xl flex items-start space-x-3">
                        <Sparkles className="h-5 w-5 text-[#38bdf8] flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-sm text-[#e1e1e6]">Image Uploaded Successfully</h4>
                          <p className="text-xs text-[#94949e] leading-relaxed mt-1">
                            Our Gemini AI will scan this photo to extract structural damage, suggest a department route, and extract location telemetry.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-[#52525b] uppercase tracking-wider">File Details</h5>
                        <div className="bg-[#18181c] border border-[#26262d] rounded-xl p-3.5 space-y-1.5 text-xs text-[#94949e]">
                          <div className="flex justify-between">
                            <span>Name:</span>
                            <span className="font-semibold text-[#e1e1e6] truncate max-w-[200px]">{uploadFile?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span className="font-semibold text-[#e1e1e6]">
                              {uploadFile ? (uploadFile.size / 1024 / 1024).toFixed(2) : 0} MB
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-[#52525b] uppercase tracking-wider">Detected Location</h5>
                            <p className="text-[11px] text-[#94949e] mt-1">Use your browser location and verify the ward, district, city, and pincode.</p>
                          </div>
                          <button
                            type="button"
                            onClick={detectLocation}
                            className="rounded-xl bg-[#38bdf8] px-3 py-2 text-xs font-semibold text-[#0a0a0b] hover:bg-[#34d399]/90 transition-colors"
                          >
                            {locationStatus === "detecting" ? "Detecting…" : "Detect Location"}
                          </button>
                        </div>

                        <div className="space-y-3 bg-[#18181c] border border-[#26262d] rounded-2xl p-4 text-xs text-[#c8cad0]">
                          {locationError && (
                            <div className="rounded-2xl bg-[#451212] border border-[#7f1d1d] p-3 text-[#fca5a5]">
                              <p className="font-medium">Location lookup failed</p>
                              <p className="mt-1 text-[11px]">{locationError}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              Latitude
                              <input
                                type="text"
                                value={locationLat ?? ""}
                                readOnly
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              Longitude
                              <input
                                type="text"
                                value={locationLng ?? ""}
                                readOnly
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              District
                              <input
                                type="text"
                                value={locationDistrict}
                                onChange={(e) => setLocationDistrict(e.target.value)}
                                placeholder="Hyderabad"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              Ward
                              <input
                                type="text"
                                value={locationWard}
                                onChange={(e) => setLocationWard(e.target.value)}
                                placeholder="Ward 4"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              City
                              <input
                                type="text"
                                value={locationCity}
                                onChange={(e) => setLocationCity(e.target.value)}
                                placeholder="Hyderabad"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              State
                              <input
                                type="text"
                                value={locationState}
                                onChange={(e) => setLocationState(e.target.value)}
                                placeholder="Telangana"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a] col-span-1 sm:col-span-2">
                              Area
                              <input
                                type="text"
                                value={locationArea}
                                onChange={(e) => setLocationArea(e.target.value)}
                                placeholder="Central Sector"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                              Pincode
                              <input
                                type="text"
                                value={locationPincode}
                                onChange={(e) => setLocationPincode(e.target.value)}
                                placeholder="500081"
                                className="mt-2 w-full rounded-xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                              />
                            </label>
                          </div>

                          <label className="block text-[10px] uppercase tracking-[0.2em] text-[#71717a]">
                            Full Address
                            <textarea
                              value={locationAddress}
                              onChange={(e) => setLocationAddress(e.target.value)}
                              rows={2}
                              placeholder="Street, neighborhood, landmark..."
                              className="mt-2 w-full rounded-2xl border border-[#26262d] bg-[#0d1118] px-3 py-2 text-sm text-[#e1e1e6]"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-[#26262d]">
                      <button
                        onClick={resetUploadState}
                        className="flex-1 bg-[#18181c] hover:bg-[#26262d] text-[#e1e1e6] border border-[#26262d] font-bold px-4 py-3 rounded-xl transition-all cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        id="citizen-submit-analysis-btn"
                        onClick={triggerUpload}
                        className="flex-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0b] font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#38bdf8]/20 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Analyze & Submit</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Error State */}
                {uploadError && (
                  <div className="flex flex-col justify-between h-full space-y-6">
                    <div className="bg-[#451212] border border-[#7f1d1d] p-5 rounded-2xl flex items-start space-x-3 text-[#f87171]">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">Analysis Pipeline Failed</h4>
                        <p className="text-xs mt-1 leading-relaxed">{uploadError}</p>
                      </div>
                    </div>
                    <button
                      onClick={resetUploadState}
                      className="w-full bg-[#18181c] hover:bg-[#26262d] text-[#e1e1e6] border border-[#26262d] font-bold py-3 rounded-xl transition-all cursor-pointer text-xs"
                    >
                      Try a Different Image
                    </button>
                  </div>
                )}

                {/* 3. Success / Complete State */}
                {analysisResult && (
                  <div className="flex flex-col justify-between h-full space-y-5">
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      <div className="flex items-center space-x-2 text-[#34d399]">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold text-sm">Complaint Filed Successfully</span>
                      </div>

                      {/* Detail list requested */}
                      <div className="space-y-3.5">
                        {/* ID */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Complaint ID</span>
                          <span className="text-xs font-mono font-bold text-[#38bdf8]">{analysisResult.report_id}</span>
                        </div>

                        {/* Issue */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Detected Issue</span>
                          <span className="text-sm font-bold text-[#e1e1e6] leading-tight block">{analysisResult.issue_category}</span>
                        </div>

                        {/* Severity */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Severity</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block border mt-0.5 ${getSeverityBadgeClass(analysisResult.severity)}`}>
                            {analysisResult.severity} Severity
                          </span>
                        </div>

                        {/* Assigned Department */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Assigned Department</span>
                          <div className="flex items-center space-x-1.5 text-xs text-[#e1e1e6] mt-1 bg-[#18181c] border border-[#26262d] px-3 py-2 rounded-xl">
                            <Building2 className="h-3.5 w-3.5 text-[#38bdf8]" />
                            <span className="font-semibold">{analysisResult.suggested_department}</span>
                          </div>
                        </div>

                        {/* Location */}
                        {analysisResult.address && (
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Location</span>
                              <div className="flex items-center space-x-1.5 text-xs text-[#e1e1e6] mt-1 bg-[#18181c] border border-[#26262d] px-3 py-2 rounded-xl">
                                <MapPin className="h-3.5 w-3.5 text-[#38bdf8]" />
                                <span className="font-semibold truncate">{analysisResult.address}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl bg-[#18181c] border border-[#26262d] p-3 text-xs text-[#94949e]">
                                <div className="font-semibold text-[#e1e1e6]">District</div>
                                <div>{analysisResult.district || locationDistrict || "Unknown"}</div>
                              </div>
                              <div className="rounded-2xl bg-[#18181c] border border-[#26262d] p-3 text-xs text-[#94949e]">
                                <div className="font-semibold text-[#e1e1e6]">Ward</div>
                                <div>{analysisResult.ward || locationWard || "Unknown"}</div>
                              </div>
                              <div className="rounded-2xl bg-[#18181c] border border-[#26262d] p-3 text-xs text-[#94949e]">
                                <div className="font-semibold text-[#e1e1e6]">City</div>
                                <div>{analysisResult.city || locationCity || "Unknown"}</div>
                              </div>
                              <div className="rounded-2xl bg-[#18181c] border border-[#26262d] p-3 text-xs text-[#94949e]">
                                <div className="font-semibold text-[#e1e1e6]">Pincode</div>
                                <div>{analysisResult.pincode || locationPincode || "Unknown"}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Date */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Date Submitted</span>
                          <span className="text-xs text-[#94949e] font-semibold">{formatDateTime(analysisResult.upload_timestamp)}</span>
                        </div>

                        {/* Status */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Current Status</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border mt-0.5 ${getStatusBadgeClass(analysisResult.status)}`}>
                            {analysisResult.status}
                          </span>
                        </div>

                        {/* Est Response Time */}
                        <div>
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Estimated Response Time</span>
                          <div className="flex items-center space-x-1.5 text-xs text-[#fbbf24] mt-1 bg-[#2d2212]/30 border border-[#78350f]/30 px-3 py-2 rounded-xl">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-semibold">{getEstimatedTime(analysisResult.severity)}</span>
                          </div>
                        </div>

                        {/* AI Description summary */}
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">AI Details & Context</span>
                          <p className="text-xs text-[#94949e] leading-relaxed mt-1 p-3 bg-[#18181c] border border-[#26262d] rounded-xl font-light">
                            {analysisResult.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#26262d] flex space-x-3">
                      <button
                        onClick={resetUploadState}
                        className="flex-1 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/20 text-[#38bdf8] font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
                      >
                        File Another Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};

export default ReportIssue;
