-- ==============================================================================
-- Supabase Schema for "PS4: Personalized Voice AI Companion"
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable the pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the memories table
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'emotional_state', 'preference')),
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Dimension for text-embedding-004 / Gemini embeddings
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create indexes for rapid querying
-- Fast lookup by user_id and recency
CREATE INDEX IF NOT EXISTS idx_memories_user_created 
ON public.memories (user_id, created_at DESC);

-- Fast lookup by memory category
CREATE INDEX IF NOT EXISTS idx_memories_type 
ON public.memories (user_id, memory_type);

-- Fast approximate nearest neighbor vector search index (HNSW for high recall & low latency)
CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw 
ON public.memories 
USING hnsw (embedding vector_cosine_ops);

-- 4. Vector similarity match function (RPC called by Python FastAPI)
CREATE OR REPLACE FUNCTION match_memories (
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 8,
  filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  memory_type TEXT,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    memories.id,
    memories.user_id,
    memories.memory_type,
    memories.content,
    1 - (memories.embedding <=> query_embedding) AS similarity,
    memories.created_at
  FROM public.memories
  WHERE (filter_user_id IS NULL OR memories.user_id = filter_user_id)
    AND memories.embedding IS NOT NULL
    AND 1 - (memories.embedding <=> query_embedding) > match_threshold
  ORDER BY memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Row Level Security (RLS) configuration
-- If using Service Role Key in FastAPI backend, service role bypasses RLS automatically.
-- If using Anon/Authenticated key, you can enable RLS:
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Allow backend service access (or open policy for hackathon prototyping)
CREATE POLICY "Allow all access to memories for hackathon MVP" 
ON public.memories 
FOR ALL 
USING (true) 
WITH CHECK (true);
