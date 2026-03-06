/**
 * In-memory vector store for Code M agent context.
 * Keyed by session ID; embeds documents via LiteLLM and supports similarity search.
 */

import { litellmEmbed } from '@/ai/litellm-client';

export interface StoredDocument {
  vector: number[];
  content: string;
  path: string;
  metadata?: Record<string, unknown>;
}

const store = new Map<string, StoredDocument[]>();

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Add a document to the session's store. Embeds content via litellmEmbed and stores vector + content.
 */
export async function addDocument(
  sessionId: string,
  fileContent: string,
  filePath: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const vector = await litellmEmbed({ input: fileContent });
  const docs = store.get(sessionId) ?? [];
  docs.push({ vector, content: fileContent, path: filePath, metadata });
  store.set(sessionId, docs);
}

/**
 * Search for top-K documents most similar to the query. Embeds query then cosine similarity search.
 */
export async function search(
  sessionId: string,
  query: string,
  topK: number = 5
): Promise<{ content: string; path: string; score: number }[]> {
  const docs = store.get(sessionId);
  if (!docs || docs.length === 0) return [];

  const queryVector = await litellmEmbed({ input: query });
  const scored = docs.map((doc) => ({
    content: doc.content,
    path: doc.path,
    score: cosineSimilarity(queryVector, doc.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Wipe all documents for a session.
 */
export function clear(sessionId: string): void {
  store.delete(sessionId);
}
