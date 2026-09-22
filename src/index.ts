import cors from "cors";
import express from "express";
import { initializeDatabase } from "./bootstrap.js";
import { testDatabaseConnection } from "./db.js";
import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import exercisesRouter from "./routes/exercises.js";
import executionsRouter from "./routes/executions.js";
import progressRouter from "./routes/progress.js";
import routinesRouter from "./routes/routines.js";
import studentsRouter from "./routes/students.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const dbStatus = await testDatabaseConnection();
  res.json({
    ok: true,
    service: "spartan-app-backend",
    database: dbStatus,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/students", studentsRouter);
app.use("/api/routines", routinesRouter);
app.use("/api/executions", executionsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/chat", chatRouter);

app.listen(port, async () => {
  await initializeDatabase();
  console.log(`Spartan App backend running on http://localhost:${port}`);
});
