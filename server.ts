import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// In-memory memory store for instant preview testing (persists across chats in dev session)
interface StoredMemory {
  id: string;
  user_id: string;
  memory_type: "fact" | "emotional_state" | "preference";
  content: string;
  created_at: string;
}

const localMemoriesStore: StoredMemory[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Google GenAI if key is present
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      geminiConfigured: !!apiKey,
      targetModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      storedMemoriesCount: localMemoriesStore.length,
    });
  });

  // Fetch codebase files for UI code viewer & download
  app.get("/api/files/:filename", (req, res) => {
    const allowed = ["main.py", "supabase_schema.sql", "requirements.txt", ".env.example"];
    const { filename } = req.params;
    if (!allowed.includes(filename)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    res.type("text/plain").send(content);
  });

  // Get memories for a user
  app.get("/api/memories/:userId", (req, res) => {
    const { userId } = req.params;
    const userMemories = localMemoriesStore.filter((m) => m.user_id === userId);
    res.json(userMemories);
  });

  // Clear memories for a user
  app.delete("/api/memories/:userId", (req, res) => {
    const { userId } = req.params;
    const beforeCount = localMemoriesStore.length;
    for (let i = localMemoriesStore.length - 1; i >= 0; i--) {
      if (localMemoriesStore[i].user_id === userId) {
        localMemoriesStore.splice(i, 1);
      }
    }
    const deletedCount = beforeCount - localMemoriesStore.length;
    res.json({ status: "cleared", user_id: userId, deleted_count: deletedCount });
  });

  // Chat endpoint executing Step A, B, C, D
  app.post("/api/chat", async (req, res) => {
    try {
      const { user_id, message } = req.body;
      if (!user_id || !message) {
        return res.status(400).json({ error: "user_id and message are required" });
      }

      // Step A: Extraction
      let extractedMemories: Array<{ memory_type: "fact" | "emotional_state" | "preference"; content: string }> = [];

      if (ai) {
        try {
          const extractionResponse = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `User Message: "${message}"`,
            config: {
              systemInstruction: `You are an expert cognitive memory extraction engine for PS4: Personalized Voice AI Companion.
Analyze the user's message and extract key memories that will help provide a deeply personalized long-term relationship.
Strictly categorize each into one of: 'fact', 'emotional_state', 'preference'.
Output must strictly be a JSON array of objects with keys "memory_type" and "content".
If no memories are present (e.g. simple greeting), return [].`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    memory_type: {
                      type: Type.STRING,
                      description: "Strictly 'fact', 'emotional_state', or 'preference'",
                    },
                    content: {
                      type: Type.STRING,
                      description: "Atomic summary of memory",
                    },
                  },
                  required: ["memory_type", "content"],
                },
              },
            },
          });

          const rawText = extractionResponse.text || "[]";
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            extractedMemories = parsed.filter(
              (m: any) =>
                ["fact", "emotional_state", "preference"].includes(m.memory_type) &&
                m.content &&
                typeof m.content === "string"
            );
          }
        } catch (extractErr) {
          console.error("Step A extraction error:", extractErr);
        }
      } else {
        // Deterministic local extraction heuristic for instant preview testing if API key is not yet set
        const lower = message.toLowerCase();
        if (lower.includes("stressed") || lower.includes("overwhelmed") || lower.includes("anxious")) {
          extractedMemories.push({ memory_type: "emotional_state", content: "Feeling stressed or overwhelmed" });
        } else if (lower.includes("excited") || lower.includes("happy") || lower.includes("great")) {
          extractedMemories.push({ memory_type: "emotional_state", content: "Feeling positive and excited" });
        }
        if (lower.includes("exam") || lower.includes("test") || lower.includes("final")) {
          extractedMemories.push({ memory_type: "fact", content: "Has upcoming exams or tests" });
        }
        if (lower.includes("tea") || lower.includes("coffee") || lower.includes("matcha")) {
          extractedMemories.push({ memory_type: "preference", content: "Enjoys warm soothing beverages" });
        }
      }

      // Step B: Database Storage
      for (const m of extractedMemories) {
        localMemoriesStore.push({
          id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id,
          memory_type: m.memory_type,
          content: m.content,
          created_at: new Date().toISOString(),
        });
      }

      // Step C: Context Retrieval
      const pastMemories = localMemoriesStore
        .filter((m) => m.user_id === user_id)
        .slice(-15);

      // Step D: Generation
      let reply = "";
      if (ai) {
        try {
          const memoriesText = pastMemories.length > 0
            ? pastMemories.map((m) => `[${m.memory_type.toUpperCase()}]: ${m.content}`).join("\n")
            : "No previous memories recorded yet.";

          const generationResponse = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: message,
            config: {
              systemInstruction: `You are "PS4: Personalized Voice AI Companion", an emotionally intelligent, supportive voice friend.
Core Directives:
1. Voice delivery: Clean, human-like speech. NO markdown asterisks, no bullets, no lists, no emojis.
2. Contextual empathy: Naturally draw upon known user memories to comfort, encourage, or connect with them.
3. Length: 2 to 4 spoken sentences. Warm, grounding, and personal.

User's Memory Context:
${memoriesText}`,
              temperature: 0.7,
            },
          });
          reply = generationResponse.text?.trim() || "I'm right here with you.";
        } catch (genErr) {
          console.error("Step D generation error:", genErr);
          reply = "I hear you clearly, and I am holding onto what you shared so we can talk through it anytime.";
        }
      } else {
        reply = `I hear you. I've noted down what you shared in your memory bank. With upcoming deadlines, remember to take a deep breath and give yourself some grace today.`;
      }

      return res.json({
        reply,
        extracted_memories: extractedMemories,
        total_stored_memories: pastMemories.length,
      });
    } catch (err: any) {
      console.error("Chat pipeline error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware setup
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
