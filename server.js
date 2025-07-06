import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import scheduleRouter from "./routes/schedule.js";
import assistantRouter from "./routes/assitant.js";

const app = express();
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: "chrome-extension://fbpojdkmpoohglbimdjahihdcfonjkhc",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/schedule", scheduleRouter);
app.use("/assistant", assistantRouter);

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    data: null,
    message: err.message || "Internal Server Error.",
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
