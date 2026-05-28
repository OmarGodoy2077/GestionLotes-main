import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors";
import rootRouter from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.use(rootRouter);

app.use(errorHandler);

export default app;
