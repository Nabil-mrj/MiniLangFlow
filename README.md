# MiniLangFlow — Local AI workflow engine with RAG and LLM orchestration

MiniLangFlow is a lightweight, fully local AI workflow engine inspired by platforms such as LangFlow and LibreChat.  
It demonstrates how to build a complete, modular system that orchestrates text generation, summarization, question answering, and Retrieval-Augmented Generation (RAG) using open-source LLMs running locally via Ollama.

This project is intentionally minimal but architecturally aligned with modern GenAI pipelines used in production environments.

---

## Technical Objectives

- Provide a local, cost-free alternative to workflow tools such as LangFlow.
- Build a modular API for text summarization, QA, and multi-step workflows.
- Implement a full RAG pipeline (document ingestion, embeddings, FAISS index, retrieval).
- Demonstrate the integration of LLM inference (Ollama) into a custom backend.
- Showcase clear separation of concerns between Node.js orchestration and Python-based vector search.

---

## Features

### LLM Orchestration (Local Execution)
- Uses **Ollama** to run models such as Llama 3 or Mistral entirely offline.
- No external API calls or cloud dependencies.
- Deterministic, reproducible pipeline.

### Modular Endpoints
Implemented in the `src/` directory through Express.js:

- `/summarize`: text summarization  
- `/qa`: question answering with optional manual context  
- `/qa-rag`: question answering enhanced with vector search  
- `/workflow`: multi-step pipeline (summarization → bullet points → question generation)

### Retrieval-Augmented Generation (RAG)
The `rag/` directory contains the foundational components of a RAG system:

- **build_index.py**  
  Loads documents, chunks them, generates embeddings, builds a FAISS index.

- **query_index.py**  
  Retrieves the top-k relevant chunks for a given query.

The backend dynamically calls these scripts to enrich responses with domain-relevant context.

### Logging & Observability
- Each request is logged in the `logs/` directory.
- Logs include timestamp, endpoint name, payload metadata, and output snippet.

---

## Project Architecture

### Node.js Backend (Express)
Orchestrates all workflows and provides a clean API surface.

Responsibilities:
- Receive client requests
- Prepare prompts
- Call the local LLM via Ollama
- Combine results (summaries, RAG context, workflow steps)
- Log all interactions

Main files:
- `server.js` — API routes and workflow logic  
- `ollamaClient.js` — interface to Ollama  
- `logger.js` — structured logging  

### Python RAG Engine
Used for vector search and chunk retrieval.

Components:
- Document ingestion from `data/`
- Text chunking
- Embedding generation (Sentence-Transformers)
- FAISS index construction and querying

This hybrid architecture reflects how modern AI systems often combine Python ML tooling with a Node.js web layer.

---

## Repository Structure
```text
.
├── README.md
│
├── src
│   ├── server.js                   # Express.js API (summarization, QA, RAG, workflow)
│   ├── ollamaClient.js             # Local LLM interface using Ollama
│   └── logger.js                   # Structured request logging
│
├── rag
│   ├── build_index.py              # Document ingestion, chunking, embedding generation, FAISS index creation
│   └── query_index.py              # Top-k retrieval and context extraction for QA-RAG
│
├── data                             # Local text corpus used for RAG
│   └── *.txt                       # Source documents
│
├── package.json                     # Node.js dependencies and scripts
└── package-lock.json               
```


