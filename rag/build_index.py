import os
import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAG_DIR = BASE_DIR / "rag"

INDEX_FILE = RAG_DIR / "index.faiss"
META_FILE = RAG_DIR / "chunks.json"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_documents():
    texts = []
    for file in DATA_DIR.glob("*.txt"):
        with open(file, "r", encoding="utf-8") as f:
            texts.append((file.name, f.read()))
    return texts


def chunk_text(text, max_chars=500):
    # simple découpage en blocs de max_chars
    chunks = []
    current = ""
    for line in text.splitlines():
        if len(current) + len(line) + 1 > max_chars:
            if current.strip():
                chunks.append(current.strip())
            current = line + "\n"
        else:
            current += line + "\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks


def main():
    docs = load_documents()
    if not docs:
        print("Aucun document trouvé dans data/.")
        return

    print(f"Documents trouvés : {[name for name, _ in docs]}")

    all_chunks = []
    for filename, content in docs:
        chunks = chunk_text(content, max_chars=500)
        for i, chunk in enumerate(chunks):
            all_chunks.append(
                {
                    "doc": filename,
                    "chunk_id": i,
                    "text": chunk,
                }
            )

    print(f"Nombre total de chunks : {len(all_chunks)}")

    # modèle d'embeddings
    model = SentenceTransformer(MODEL_NAME)
    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # enregistrement
    faiss.write_index(index, str(INDEX_FILE))
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"Index FAISS écrit dans {INDEX_FILE}")
    print(f"Métadonnées écrites dans {META_FILE}")


if __name__ == "__main__":
    main()
