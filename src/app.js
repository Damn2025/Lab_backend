import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getPublicSearchConfig } from "./config/allowedTables.js";
import { fetchStateOptions, searchLabsDataset } from "./services/labSearchService.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "supabase-filter-backend"
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

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: error.message || "Unexpected server error."
  });
});

export default app;
