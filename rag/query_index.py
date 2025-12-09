import sys
import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
RAG_DIR = BASE_DIR / "rag"

INDEX_FILE = RAG_DIR / "index.faiss"
META_FILE = RAG_DIR / "chunks.json"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_index_and_meta():
    index = faiss.read_index(str(INDEX_FILE))
    with open(META_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    return index, chunks


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No question provided"}))
        return

    question = " ".join(sys.argv[1:]).strip()
    if not question:
        print(json.dumps({"error": "Empty question"}))
        return

    index, chunks = load_index_and_meta()
    model = SentenceTransformer(MODEL_NAME)

    q_emb = model.encode([question], convert_to_numpy=True)
    k = min(5, len(chunks))  # top-k
    distances, indices = index.search(q_emb, k)

    selected = []
    for idx in indices[0]:
        selected.append(chunks[idx])

    context = "\n\n".join([c["text"] for c in selected])

    output = {
        "question": question,
        "context": context,
        "chunks": selected,
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()