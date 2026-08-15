import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { create, all, evaluate, simplify, parse } from "mathjs";
const math = create(all);
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function buildSteps(question, answer) {
  const node = parse(question);
  const simplified = simplify(node);

  return [
    `Problem: $${question}$`,
    `Simplified: $${simplified.toString()}$`,
    `Final Answer: $${answer}$`
  ];
}

// NOTE: math.solve() is not a mathjs method; this route will always return the error response
app.post("/solve-equation", (req, res) => {
  const { equation } = req.body;

  try {
    const node = math.parse(equation);
    const solved = math.solve(node, 'x');

    res.json({ equation, solution: solved });
  } catch (err) {
    res.json({ error: "I couldn't solve that equation." });
  }
});

app.post("/solve", (req, res) => {
  const { problem } = req.body;

  try {
    const answer = math.evaluate(problem);
    res.json({ problem, answer });
  } catch (err) {
    res.json({ error: "I couldn't understand that math problem." });
  }
});

app.post("/tutor-offline", (req, res) => {
  const question = req.body.question;

  if (!question || typeof question !== "string") {
    return res.json({ answer: "Please provide a math question.", steps: [] });
  }

  const steps = [];
  steps.push(`Problem: ${question}`);

  let finalAnswer = null;

  try {
    const simplified = simplify(question);
    steps.push(`Simplified: ${simplified.toString()}`);
  } catch {
    steps.push("Simplified: (could not simplify)");
  }

  try {
    const result = math.evaluate(question);
    finalAnswer = result;
    steps.push(`Numeric Evaluation: ${result}`);
  } catch {
    steps.push("Numeric Evaluation: (could not evaluate)");
  }

  if (!finalAnswer && !steps.length) {
    finalAnswer = "I couldn't solve that problem.";
  }

  res.json({
    answer: finalAnswer ?? "I couldn't solve that problem.",
    steps
  });
});

app.post("/math-tutor", async (req, res) => {
  try {
    const question = req.body.question;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ answer: "Please provide a math question." });
    }
    if (!client) {
      return res.status(500).json({ answer: "Server is missing OPENAI_API_KEY." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI math tutor. Solve ANY math problem from kindergarten to college. Always show step-by-step explanations using LaTeX."
        },
        { role: "user", content: question }
      ]
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    res.json({ answer: "I couldn't solve that problem." });
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

app.post("/solve-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        answer: null,
        steps: [],
        error: "No image received"
      });
    }

    if (!client) {
      return res.status(500).json({
        answer: null,
        steps: [],
        error: "Server is missing OPENAI_API_KEY."
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a math vision tutor. Extract the math problem from the image and solve it step-by-step. Return only the math steps and final answer."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Solve the math problem in this image." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });

    const answer = completion.choices[0].message.content || "I couldn't read the image.";

    res.json({
      answer,
      steps: answer.split("\n").filter(Boolean),
      error: null
    });
  } catch (err) {
    console.log("IMAGE ERROR:", err);

    res.json({
      answer: null,
      steps: [],
      error: "AI vision model failed"
    });
  }
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage || typeof userMessage !== "string") {
    return res.json({ answer: "Please send a valid message." });
  }

  const mathPattern = /^[0-9+\-*/^().\s]+$/;

  if (mathPattern.test(userMessage)) {
    try {
      const result = math.evaluate(userMessage);
      return res.json({ answer: `Answer: ${result}` });
    } catch (err) {
      return res.json({ answer: "I couldn't evaluate that math expression." });
    }
  }

  if (!client) {
    return res.json({ answer: "I couldn't solve that problem." });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a precise AI tutor." },
        { role: "user", content: userMessage }
      ]
    });

    const answer = completion.choices?.[0]?.message?.content || "I couldn't generate a response.";
    res.json({ answer });
  } catch (err) {
    res.json({ answer: "I couldn't process that request." });
  }
});

app.get("/test", (req, res) => {
  res.json({ status: "online" });
});

app.get("/check-key", (req, res) => {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  res.json({
    configured,
    message: configured ? "OPENAI_API_KEY is configured." : "OPENAI_API_KEY is not configured."
  });
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
