import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db, initDb, refreshDb } from "./backend/db";
import errorHandler from "./backend/middleware/errorHandler";

// Import backend routers
import authRouter from "./backend/routes/auth";
import customersRouter from "./backend/routes/customers";
import chartsRouter from "./backend/routes/charts";
import pricesRouter from "./backend/routes/prices";
import settingsRouter from "./backend/routes/settings";
import collectionRouter from "./backend/routes/collection";
import salesRouter from "./backend/routes/sales";
import advancesRouter from "./backend/routes/advances";
import paymentsRouter from "./backend/routes/payments";
import receiptsRouter from "./backend/routes/receipts";
import analyticsRouter from "./backend/routes/analytics";

dotenv.config({ path: [".env.local", ".env"] });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Connect to MongoDB and hydrate the application data.
  await initDb();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Debug logging for API requests
  app.use((req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // MongoDB is the source of truth. Refresh before every API request.
  app.use("/api", async (req, res, next) => {
    try {
      await refreshDb();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Mount API routers
  app.use("/api/auth", authRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/charts", chartsRouter);
  app.use("/api/prices", pricesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/collection", collectionRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/advances", advancesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/receipts", receiptsRouter);
  app.use("/api/analytics", analyticsRouter);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      dairies: db.dairies.length,
      customers: db.customers.length,
    });
  });

  // Backend Error handling middleware
  app.use(errorHandler);

  // Vite integration as middleware for Development, static serving for Production
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

  //   // Bind server to port 3000 and host 0.0.0.0 (required for Cloud Run environments)
  //   app.listen(PORT, "127.0.0.1", () => {
  //     console.log(`[DAIRY APP SERVER] running on http://localhost:${PORT}`);
  //   });
  // }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DAIRY APP SERVER] running on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[SERVER BOOT ERROR]:", err);
});
