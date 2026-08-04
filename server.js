import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { evaluate, simplify, parse } from "mathjs";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

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

    let answer;
    try {
      answer = evaluate(question);
    } catch {
      return res.json({
        answer: "I couldn't understand that math expression.",
        steps: []
      });
    }

    res.json({
      answer: String(answer),
      steps: buildSteps(question, answer)
    });
  } catch (err) {
    console.log("MATH ERROR:", err);
    res.json({
      answer: null,
      steps: [],
      error: "Math solver failed"
    });
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
