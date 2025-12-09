// src/logger.js
import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "requests.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logRequest(endpoint, payload, response) {
  // on convertit la réponse en string proprement
  let responseStr;
  if (typeof response === "string") {
    responseStr = response;
  } else {
    try {
      responseStr = JSON.stringify(response);
    } catch (e) {
      responseStr = String(response);
    }
  }

  const line =
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        endpoint,
        payload,
        responseSnippet: responseStr.slice(0, 200),
      }
    ) + "\n";

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      console.error("Erreur d’écriture du log:", err);
    }
  });
}
