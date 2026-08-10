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

// math.solve() is not a mathjs method; equationSolution will always be null
app.post("/tutor-offline", (req, res) => {
  const question = req.body.question;

  if (!question || typeof question !== "string") {
    return res.json({ answer: "Please provide a math question." });
  }

  try {
    let numericAnswer;
    try {
      numericAnswer = math.evaluate(question);
    } catch {
      numericAnswer = null;
    }

    let equationSolution;
    try {
      const node = parse(question);
      equationSolution = math.solve(node, "x");
    } catch {
      equationSolution = null;
    }

    const steps = [];
    steps.push(`Problem: ${question}`);

    try {
      const simplified = simplify(question);
      steps.push(`Simplified: ${simplified.toString()}`);
    } catch {
      steps.push("Simplified: (could not simplify)");
    }

    if (numericAnswer !== null) steps.push(`Numeric Answer: ${numericAnswer}`);
    if (equationSolution !== null) steps.push(`Equation Solution: x = ${JSON.stringify(equationSolution)}`);

    const finalAnswer =
      equationSolution !== null
        ? `x = ${JSON.stringify(equationSolution)}`
        : numericAnswer !== null
        ? numericAnswer
        : "I couldn't solve that problem.";

    res.json({ answer: finalAnswer, steps });
  } catch (err) {
    res.json({ answer: "I couldn't solve that problem." });
  }
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
      return res.status(400).json({ answer: "No image uploaded." });
    }
    if (!client) {
      return res.status(500).json({ answer: "Server is missing OPENAI_API_KEY." });
    }

    const base64 = req.file.buffer.toString("base64");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI math tutor. Extract the math problem from the image and solve it step-by-step using LaTeX."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Solve the math problem in this image." },
            { type: "input_image", image_url: `data:image/png;base64,${base64}` }
          ]
        }
      ]
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    res.json({ answer: "I couldn't read the image." });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ answer: "Please send a valid message." });
    }

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
