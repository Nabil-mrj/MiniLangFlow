// src/server.js
import express from "express";
import dotenv from "dotenv";
import { spawn } from "child_process";

import { generateText } from "./ollamaClient.js";
import { logRequest } from "./logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------- Utilitaire RAG : appel du script Python ----------

function getRagContext(question) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", ["rag/query_index.py", question], {
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        console.error("Erreur Python:", stderr);
        return reject(new Error("Python exited with code " + code));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(parsed); // { question, context, chunks }
      } catch (e) {
        console.error("Erreur parsing JSON Python:", e, stdout);
        reject(e);
      }
    });
  });
}

// ---------- Healthcheck ----------

app.get("/", (req, res) => {
  res.json({ status: "MiniLangFlow API up" });
});

// ---------- /summarize : résumé simple via LLM ----------

app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Le champ 'text' est requis et ne doit pas être vide." });
    }

    const prompt = `Résume le texte suivant de manière concise en français, en 5 phrases maximum :

${text}
`;

    const summary = await generateText(prompt);

    logRequest("/summarize", { text }, summary);

    res.json({ summary });
  } catch (err) {
    console.error("Erreur /summarize:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// ---------- /qa : question/réponse avec contexte optionnel ----------

app.post("/qa", async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: "Le champ 'question' est requis et ne doit pas être vide.",
      });
    }

    const safeContext =
      context && context.trim().length > 0
        ? context
        : "Aucun contexte spécifique n'est fourni. Réponds de manière générale.";

    const prompt = `
Tu es un assistant IA utile et précis. Tu dois répondre en français.

Contexte :
${safeContext}

Question :
${question}

Réponse détaillée (mais concise) :
`;

    const answer = await generateText(prompt);

    logRequest("/qa", { question, context }, answer);

    res.json({ answer });
  } catch (err) {
    console.error("Erreur /qa:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// ---------- /qa-rag : QA avec contexte issu du RAG ----------

app.post("/qa-rag", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: "Le champ 'question' est requis et ne doit pas être vide.",
      });
    }

    const ragResult = await getRagContext(question);
    const { context, chunks } = ragResult;

    const prompt = `
Tu es un assistant IA spécialisé dans la compréhension d'une base de connaissances locale.
Utilise UNIQUEMENT le contexte fourni pour répondre, et réponds en français.

Contexte :
${context}

Question :
${question}

Réponse (claire, structurée, concise) :
`;

    const answer = await generateText(prompt);

    logRequest("/qa-rag", { question, usedChunks: chunks }, answer);

    res.json({
      answer,
      context,
      chunks,
    });
  } catch (err) {
    console.error("Erreur /qa-rag:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// ---------- /workflow : pipeline multi-étapes ----------
// 1) Résumé du texte
// 2) Bullet points
// 3) Questions de révision

app.post("/workflow", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Le champ 'text' est requis et ne doit pas être vide." });
    }

    // Étape 1 : résumé
    const summaryPrompt = `Tu es un assistant IA.
Résume le texte suivant en français, en 5 phrases maximum, en gardant les informations clés :

${text}
`;
    const summary = await generateText(summaryPrompt);

    // Étape 2 : bullet points à partir du résumé
    const bulletsPrompt = `À partir du résumé suivant, produis une liste de bullet points clairs en français.
Utilise un tiret '-' au début de chaque point.

Résumé :
${summary}
`;
    const bullets = await generateText(bulletsPrompt);

    // Étape 3 : générer des questions sur le contenu
    const questionsPrompt = `À partir du contenu suivant (texte résumé et bullet points),
génère 5 questions pertinentes en français, pour vérifier la compréhension du sujet.

Résumé :
${summary}

Bullet points :
${bullets}
`;
    const questions = await generateText(questionsPrompt);

    const workflowResult = {
      summary,
      bullets,
      questions,
    };

    logRequest("/workflow", { text }, workflowResult);

    res.json(workflowResult);
  } catch (err) {
    console.error("Erreur /workflow:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// ---------- Démarrage serveur ----------

app.listen(PORT, () => {
  console.log(`MiniLangFlow backend running on port ${PORT}`);
});
