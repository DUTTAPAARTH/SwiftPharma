import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.post("/api/auth/login", (req, res) => {
  console.log("Login request received:", req.body);
  res.json({
    success: true,
    token: "test-token-123",
    user: { id: 1, name: "Test", email: req.body.email },
  });
});

const server = app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
});

// Prevent exit
process.stdin.resume();
