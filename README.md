# CivicLens 🏛️

**CivicLens** is an AI-powered Civic Action Platform built to modernize municipal infrastructure reporting. Citizens can simply snap a photo of a local hazard, and CivicLens uses Google's Gemini Vision AI to instantly classify the issue, determine its severity, and route it to the appropriate city department.

## 🌟 Key Features

- **AI Image Analysis**: Automatically inspects images to identify civic issues like potholes, water leaks, and illegal dumping.
- **Smart Routing**: Determines the severity of an issue and suggests the most relevant municipal department (e.g., Department of Transportation, Sanitation).
- **Public Issue Ledger**: Maintains a transparent, real-time catalog of all reported issues.
- **Interactive Dashboard**: View statistics and operational flow of municipal infrastructure reports.
- **Location Mapping**: Generates realistic coordinate pins for reports based on scene context.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React (Icons), Motion (Animations)
- **Backend**: Node.js, Express
- **Database**: SQLite
- **AI Integration**: Google Gemini AI (`@google/genai`)
- **File Handling**: Multer (Local Image Storage)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/puranik1406/CivicLens.git
   cd CivicLens
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory (you can use `.env.example` as a reference):
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   
   The server will start at `http://localhost:3000`. The Vite frontend is served through the Express backend during development.

## 📂 Project Structure

- `src/` - React frontend code (Components, Pages, App.tsx, etc.)
- `server.ts` - Node.js Express server handling API routes, SQLite initialization, and Gemini API calls.
- `civiclens.db` - SQLite database (auto-generated) storing all issue reports.
- `uploads/` - Local directory storing user-uploaded images.
- `dist/` - Production build output.

## 🔒 Environment Variables

- `GEMINI_API_KEY`: Essential for image processing and issue classification. You can acquire this from Google AI Studio.
- `APP_URL`: Base URL of the application.

## 📝 License

This project is licensed under the MIT License.
