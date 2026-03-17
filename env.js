import dotenv from "dotenv";

// Load .env and override any previously set env vars
dotenv.config({ override: true });

// Strip carriage returns and surrounding whitespace from every env var
// This fixes the Windows \r\n line-ending issue that corrupts JWT_SECRET
for (const key of Object.keys(process.env)) {
    if (typeof process.env[key] === "string") {
        process.env[key] = process.env[key].replace(/\r/g, "").trim();
    }
}
