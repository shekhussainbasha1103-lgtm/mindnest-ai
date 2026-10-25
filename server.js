const express = require("express");
const path = require("path");
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: "gemini", keyConfigured: Boolean(apiKey) });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "Add GEMINI_API_KEY in Render Environment settings." });
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "Please enter a question." });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        "You are MindNest AI, a friendly study assistant. Explain clearly for students, use examples when helpful, and say when unsure.",
        message
      ]
    });
    return res.json({ reply: response.text || "I couldn't generate a response. Please try again." });
  } catch (error) {
    console.error("Gemini request failed:", error?.message || error);
    return res.status(500).json({ error: "Gemini couldn't answer. Check Render logs and your Gemini API quota." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`MindNest AI is running on port ${PORT}`));
