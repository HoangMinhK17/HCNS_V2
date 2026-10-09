import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import connectRedis from "./config/redis.js";
import apiRouter from "./routers/apiRouter.js";
import initCronJobs from "./config/cronJobs.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";

dotenv.config();
connectDB();
connectRedis();
initCronJobs();

const app = express();
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:5174", "http://127.0.0.1:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// Áp dụng rate limit toàn cục trước khi vào router
app.use("/api/v1/fumee", globalLimiter, apiRouter);

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});