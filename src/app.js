import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getPublicSearchConfig } from "./config/allowedTables.js";
import {
  fetchStateOptions,
  searchLabsDataset,
  getLabTests,
  searchByProduct
} from "./services/labSearchService.js";

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://labcarepro.netlify.app"
];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
];

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || uniqueAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "lab-backend"
  });
});

app.get("/api/config", async (_req, res, next) => {
  try {
    res.json({
      config: {
        ...getPublicSearchConfig(),
        stateOptions: await fetchStateOptions()
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/data", async (req, res, next) => {
  try {
    const { filters = {}, limit, sort, page, search = "", labType = "" } = req.body ?? {};
    const result = await searchLabsDataset({ filters, limit, sort, page, search, labType });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/products/search", async (req, res, next) => {
  try {
    const product = req.query.product || "";
    const result = await searchByProduct(product);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/labs/:source/:labId/tests", async (req, res, next) => {
  try {
    const { source, labId } = req.params;
    const tests = await getLabTests(source, labId);
    return res.json({ tests });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: error.message || "Unexpected server error."
  });
});

export default app;
