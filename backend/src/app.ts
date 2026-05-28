import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

app.use("/health", healthRouter);

// TODO: registrar routers de negocio aquí cuando estén listos

app.use(errorHandler);

export default app;
