import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { evaluate, simplify, parse } from "mathjs";
import OpenAI from "openai";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildSteps(question, answer) {
  const node = parse(question);
  const simplified = simplify(node);

  return [
    `Problem: $${question}$`,
    `Simplified: $${simplified.toString()}$`,
    `Final Answer: $${answer}$`
  ];
}

app.post("/math-tutor", async (req, res) => {
  try {
    const question = req.body.question;

    const answer = evaluate(question);

    res.json({
      answer: String(answer),
      steps: [
        `Problem: $${question}$`,
        `Final Answer: $${answer}$`
      ]
    });
  } catch (err) {
    res.json({ answer: null });
  }
});

app.post("/show-work", async (req, res) => {
  try {
    const question = req.body.question;
    let answer;

    try {
      answer = evaluate(question);
    } catch {
      return res.json({ steps: [] });
    }

    res.json({ steps: buildSteps(question, answer) });
  } catch (err) {
    console.log("SHOW WORK ERROR:", err);
    res.json({ steps: [] });
  }
});

app.post("/solve-image", (req, res) => {
  res.json({
    answer: "Image solving is not enabled on this local server yet.",
    question: "Uploaded image",
    steps: []
  });
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ answer: "Please send a valid message." });
    }

    const client = getOpenAIClient();
    if (!client) {
      return res.status(500).json({ answer: "Server is missing OPENAI_API_KEY." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a precise AI tutor. Answer clearly and correctly. If unsure, say what is uncertain and ask one clarifying question."
        },
        { role: "user", content: userMessage }
      ]
    });

    const answer = completion.choices?.[0]?.message?.content || "I couldn't generate a response.";

    res.json({ answer });
  } catch (err) {
    console.log("CHAT ERROR:", err);
    res.status(500).json({ answer: "I couldn't process that request." });
  }
});

app.get("/test", (req, res) => {
  res.json({ status: "online" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(["/tutor", "/tutor.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "tutor.html"));
});

app.get(["/topics", "/topics.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "topics.html"));
});

app.get(["/about", "/about.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "about.html"));
});

app.use(express.static(__dirname));

app.listen(3000, () => console.log("Server running on port 3000"));
