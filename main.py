"""
PS4: Personalized Voice AI Companion - Backend API
Built with FastAPI, Google GenAI SDK (gemini-3.6-flash), and Supabase (pgvector).

Features:
- Step A: Structured memory extraction (fact, emotional_state, preference)
- Step B: Memory storage in Supabase (with pgvector embedding support)
- Step C: Context retrieval of past memories for personalized recall
- Step D: Context-aware response generation optimized for voice output
"""

import os
import json
import logging
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Official Google GenAI SDK
from google import genai
from google.genai import types

# Supabase Client
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ps4_companion")

# ---------------------------------------------------------------------------
# Configuration & Client Initialization
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY environment variable is missing. LLM calls will fail.")

# User specified model: 'gemini-3.6-flash'
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-004")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("SUPABASE_URL or SUPABASE_KEY is not set. Supabase storage will fail unless configured.")

# Initialize Google GenAI client
ai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Initialize Supabase client
supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Connected to Supabase successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")

# ---------------------------------------------------------------------------
# FastAPI Application & CORS
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PS4: Personalized Voice AI Companion API",
    description="Backend service powering personalized voice interactions with memory extraction and pgvector context recall.",
    version="1.0.0"
)

# Enable CORS middleware for all origins as required
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
MemoryType = Literal["fact", "emotional_state", "preference"]

class MemoryItem(BaseModel):
    memory_type: MemoryType = Field(
        ...,
        description="Strict category: 'fact', 'emotional_state', or 'preference'"
    )
    content: str = Field(
        ...,
        description="Concise, self-contained summary of the memory"
    )

class ChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique user identifier", example="user_123")
    message: str = Field(..., description="The user's spoken or typed message", example="I'm feeling really stressed about my biology exam tomorrow, but drinking peppermint tea helps me relax.")

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Personalized, context-aware companion response")
    extracted_memories: List[MemoryItem] = Field(..., description="Memories extracted from the current message")

class HealthResponse(BaseModel):
    status: str
    gemini_connected: bool
    supabase_connected: bool
    gemini_model: str

# ---------------------------------------------------------------------------
# Helper: Memory Extraction (Step A)
# ---------------------------------------------------------------------------
EXTRACTION_SYSTEM_PROMPT = """You are an expert cognitive memory extraction engine for PS4: Personalized Voice AI Companion.
Your task is to analyze the user's message and extract key memories that will help provide a deeply personalized, long-term relationship.

Strict Categorization Rules:
1. 'fact': Concrete biographical or situational truths about the user (e.g., job, exams, pets, locations, relationship status).
2. 'emotional_state': Current or recurring mood, emotional feelings, energy levels, or mental states (e.g., stressed, excited, exhausted, grieving, confident).
3. 'preference': Likes, dislikes, habits, calming rituals, favorite things, or communication preferences (e.g., loves peppermint tea, prefers short walks, hates loud noises).

Output Format:
You MUST respond with a valid JSON array of objects.
Each object must have exactly two keys:
- "memory_type": strictly one of ["fact", "emotional_state", "preference"]
- "content": concise, atomic, third-person declarative summary (e.g., "Feels stressed about biology exam", "Finds peppermint tea relaxing to drink")

If the message contains no new memories or personal information (e.g., a simple greeting like "Hello" or "How are you?"), return an empty array: []
Do not include markdown codeblocks or extra conversational filler. Return pure JSON only.
"""

def extract_memories(user_message: str) -> List[MemoryItem]:
    """
    Step A: Send user message to Gemini to extract structured memories.
    Uses structured JSON mode.
    """
    if not ai_client:
        logger.error("GenAI client not initialized.")
        return []

    try:
        response = ai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=f"User Message:\n\"{user_message}\"")]
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1,  # Low temperature for deterministic classification
            )
        )

        raw_text = response.text or "[]"
        cleaned_text = raw_text.strip()
        # Remove any stray codeblock formatting if present
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]

        parsed = json.loads(cleaned_text.strip())
        memories: List[MemoryItem] = []
        if isinstance(parsed, list):
            for item in parsed:
                m_type = item.get("memory_type", "").lower()
                content = item.get("content", "").strip()
                if m_type in ["fact", "emotional_state", "preference"] and content:
                    memories.append(MemoryItem(memory_type=m_type, content=content))
        return memories
    except Exception as e:
        logger.error(f"Error during memory extraction: {e}")
        return []

# ---------------------------------------------------------------------------
# Helper: Vector Embedding Generation (for pgvector)
# ---------------------------------------------------------------------------
def generate_embedding(text: str) -> Optional[List[float]]:
    """Generates a text vector embedding using Google GenAI SDK for pgvector."""
    if not ai_client:
        return None
    try:
        embed_resp = ai_client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text
        )
        if hasattr(embed_resp, "embedding") and embed_resp.embedding:
            return embed_resp.embedding.values
        elif hasattr(embed_resp, "embeddings") and embed_resp.embeddings:
            return embed_resp.embeddings[0].values
    except Exception as e:
        logger.warning(f"Could not generate vector embedding for text '{text[:30]}...': {e}")
    return None

# ---------------------------------------------------------------------------
# Helper: Database Storage (Step B)
# ---------------------------------------------------------------------------
def store_memories(user_id: str, memories: List[MemoryItem]) -> None:
    """
    Step B: Insert extracted memories into Supabase `memories` table.
    Columns: id (auto/uuid), user_id, memory_type, content, created_at, [embedding]
    """
    if not supabase_client or not memories:
        return

    records_to_insert = []
    now_iso = datetime.utcnow().isoformat()

    for m in memories:
        record: Dict[str, Any] = {
            "user_id": user_id,
            "memory_type": m.memory_type,
            "content": m.content,
            "created_at": now_iso
        }
        # Attempt to attach vector embedding for pgvector
        vec = generate_embedding(m.content)
        if vec:
            record["embedding"] = vec

        records_to_insert.append(record)

    try:
        # Try inserting with vector embedding first
        supabase_client.table("memories").insert(records_to_insert).execute()
        logger.info(f"Successfully stored {len(records_to_insert)} memories for user {user_id}")
    except Exception as e:
        logger.warning(f"Insert with embedding failed ({e}). Retrying without embedding column...")
        # Fallback: if table doesn't have embedding column, insert without it
        clean_records = [
            {
                "user_id": r["user_id"],
                "memory_type": r["memory_type"],
                "content": r["content"],
                "created_at": r["created_at"]
            }
            for r in records_to_insert
        ]
        try:
            supabase_client.table("memories").insert(clean_records).execute()
            logger.info(f"Successfully stored {len(clean_records)} memories (standard columns) for user {user_id}")
        except Exception as retry_err:
            logger.error(f"Failed to store memories in Supabase: {retry_err}")

# ---------------------------------------------------------------------------
# Helper: Context Retrieval (Step C)
# ---------------------------------------------------------------------------
def retrieve_user_context(user_id: str, current_message: str, max_items: int = 15) -> List[Dict[str, Any]]:
    """
    Step C: Query the Supabase `memories` table for past memories associated with user_id.
    Tries pgvector similarity search RPC (match_memories) if available, or falls back to recent memories.
    """
    if not supabase_client:
        return []

    retrieved: List[Dict[str, Any]] = []

    # 1. Attempt pgvector similarity search via Supabase RPC if embedding available
    query_vec = generate_embedding(current_message)
    if query_vec:
        try:
            rpc_res = supabase_client.rpc(
                "match_memories",
                {
                    "query_embedding": query_vec,
                    "match_threshold": 0.3,
                    "match_count": 8,
                    "filter_user_id": user_id
                }
            ).execute()
            if rpc_res.data:
                retrieved.extend(rpc_res.data)
                logger.info(f"pgvector retrieved {len(rpc_res.data)} relevant memories via semantic search.")
        except Exception as e:
            logger.info(f"pgvector RPC search unavailable or skipped: {e}")

    # 2. Query most recent user memories to ensure complete temporal awareness
    try:
        query_res = (
            supabase_client.table("memories")
            .select("id, memory_type, content, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(max_items)
            .execute()
        )
        if query_res.data:
            existing_ids = {m.get("id") for m in retrieved if "id" in m}
            for row in query_res.data:
                if row.get("id") not in existing_ids:
                    retrieved.append(row)
                    existing_ids.add(row.get("id"))
    except Exception as e:
        logger.error(f"Failed to query recent memories from Supabase: {e}")

    return retrieved

# ---------------------------------------------------------------------------
# Helper: Generation (Step D)
# ---------------------------------------------------------------------------
def generate_personalized_response(
    user_id: str,
    current_message: str,
    memories: List[Dict[str, Any]]
) -> str:
    """
    Step D: Pass retrieved memories and current message into Gemini (gemini-3.6-flash)
    to generate a context-aware, personalized voice companion response.
    """
    if not ai_client:
        return "I'm having trouble connecting to my cognitive core right now. Please check your API configuration."

    # Format memories into structured sections
    facts: List[str] = []
    emotional_states: List[str] = []
    preferences: List[str] = []

    for m in memories:
        m_type = m.get("memory_type")
        content = m.get("content", "")
        if m_type == "fact":
            facts.append(f"- {content}")
        elif m_type == "emotional_state":
            emotional_states.append(f"- {content}")
        elif m_type == "preference":
            preferences.append(f"- {content}")

    memory_summary_parts = []
    if facts:
        memory_summary_parts.append("Known Facts about User:\n" + "\n".join(facts))
    if emotional_states:
        memory_summary_parts.append("Recent Emotional States:\n" + "\n".join(emotional_states))
    if preferences:
        memory_summary_parts.append("Known Preferences & Calming Habits:\n" + "\n".join(preferences))

    memory_context_str = "\n\n".join(memory_summary_parts) if memory_summary_parts else "No previous memories recorded yet. This might be our first conversation!"

    generation_system_instruction = f"""You are "PS4: Personalized Voice AI Companion", an emotionally intelligent, supportive, and deeply attentive voice friend.

Your Core Directives:
1. Voice-First Delivery: Your responses will be read aloud by a text-to-speech voice model. Write in smooth, natural, human-like speech.
   - Do NOT use markdown asterisks, bullet points, headers, numbered lists, emojis, or code blocks.
   - Keep sentences clean, conversational, and cadence-friendly.
2. Contextual Empathy: Use the user's stored memories to make them feel truly remembered and understood without sounding creepy. Reference facts, past emotional states, or preferences naturally when relevant.
3. Warm & Grounding: If the user is anxious or overwhelmed, acknowledge their feelings gently, offer encouraging perspective, and bring in calming rituals they enjoy if appropriate.
4. Conciseness: Aim for 2 to 4 spoken sentences unless they ask for something deeper. Keep the dialogue flowing seamlessly.

User's Memory Bank:
\"\"\"
{memory_context_str}
\"\"\"
"""

    try:
        response = ai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=current_message)]
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=generation_system_instruction,
                temperature=0.7,
            )
        )
        return response.text.strip() if response.text else "I hear you, and I'm right here with you."
    except Exception as e:
        logger.error(f"Error during response generation: {e}")
        return f"I'm listening, but I encountered an issue generating a response: {str(e)}"

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint validating Gemini and Supabase connection readiness."""
    return HealthResponse(
        status="healthy",
        gemini_connected=ai_client is not None,
        supabase_connected=supabase_client is not None,
        gemini_model=GEMINI_MODEL
    )

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main Personalized Companion Chat Pipeline:
    - Step A: Extract memories ('fact', 'emotional_state', 'preference') via Gemini
    - Step B: Store extracted memories into Supabase 'memories' table (with pgvector embedding)
    - Step C: Retrieve past memories for user_id to provide contextual continuity
    - Step D: Generate a context-aware, personalized response via Gemini
    """
    if not request.user_id or not request.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id cannot be empty"
        )
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message cannot be empty"
        )

    # Step A (Extraction)
    logger.info(f"Step A: Extracting memories for user {request.user_id}")
    new_memories = extract_memories(request.message)
    logger.info(f"Extracted {len(new_memories)} new memories: {[m.dict() for m in new_memories]}")

    # Step B (Database Storage)
    if new_memories:
        logger.info(f"Step B: Storing memories into Supabase for user {request.user_id}")
        store_memories(request.user_id, new_memories)

    # Step C (Context Retrieval)
    logger.info(f"Step C: Retrieving context memories for user {request.user_id}")
    past_memories = retrieve_user_context(request.user_id, request.message)
    logger.info(f"Retrieved {len(past_memories)} total memories for context")

    # Step D (Generation)
    logger.info(f"Step D: Generating personalized response via {GEMINI_MODEL}")
    reply = generate_personalized_response(
        user_id=request.user_id,
        current_message=request.message,
        memories=past_memories
    )

    return ChatResponse(
        reply=reply,
        extracted_memories=new_memories
    )

@app.get("/memories/{user_id}", response_model=List[Dict[str, Any]])
def get_user_memories(user_id: str, limit: int = 50):
    """Convenience endpoint: View all stored memories for a given user in Supabase."""
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase client is not configured"
        )
    try:
        res = (
            supabase_client.table("memories")
            .select("id, user_id, memory_type, content, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )

@app.delete("/memories/{user_id}")
def clear_user_memories(user_id: str):
    """Convenience endpoint: Delete all memories for a user (useful for hackathon resets)."""
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase client is not configured"
        )
    try:
        res = supabase_client.table("memories").delete().eq("user_id", user_id).execute()
        return {"status": "cleared", "user_id": user_id, "deleted_count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete memories: {str(e)}"
        )

# ---------------------------------------------------------------------------
# Direct Script Execution (uvicorn entry point)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting PS4 Companion FastAPI server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
