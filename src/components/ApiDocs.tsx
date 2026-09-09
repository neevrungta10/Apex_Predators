import React, { useState } from 'react';
import { Terminal, Copy, Check, Server, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const curlChat = `curl -X POST "http://localhost:8000/chat" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_alex_123",
    "message": "I feel super anxious about my defense presentation tomorrow morning, but sipping warm chamomile tea helps keep me calm."
  }'`;

  const curlHealth = `curl -X GET "http://localhost:8000/health"`;

  const curlMemories = `curl -X GET "http://localhost:8000/memories/user_alex_123"`;

  const envExample = `# Google Gemini AI API Key
GEMINI_API_KEY="AIzaSy..."

# Gemini Model alias or specific release
GEMINI_MODEL="gemini-3.6-flash"

# Supabase PostgreSQL Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="eyJhbGciOi..."
`;

  const installCmd = `pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000`;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-2">
          PS4: Personalized Voice AI Companion Architecture
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          The companion service connects conversational audio/text input to a 4-step memory pipeline. Every message automatically enriches the user's permanent cognitive profile in Supabase using pgvector semantic search and Gemini reasoning.
        </p>

        {/* 4 Steps Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
            <span className="font-bold text-indigo-900 block mb-1">Step A: Extraction</span>
            <span className="text-indigo-700 leading-snug block">
              Gemini classifies messages into atomic <code>fact</code>, <code>emotional_state</code>, and <code>preference</code> items.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
            <span className="font-bold text-blue-900 block mb-1">Step B: Storage</span>
            <span className="text-blue-700 leading-snug block">
              Embeddings are calculated and inserted directly into Supabase table <code>memories</code> with pgvector vectors.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs">
            <span className="font-bold text-emerald-900 block mb-1">Step C: Retrieval</span>
            <span className="text-emerald-700 leading-snug block">
              Fetches relevant user memories using vector similarity RPC and temporal recency to build grounding context.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 text-xs">
            <span className="font-bold text-amber-900 block mb-1">Step D: Generation</span>
            <span className="text-amber-700 leading-snug block">
              Gemini 3.6 Flash produces an empathetic, human-sounding response ready for Text-to-Speech (TTS) synthesis.
            </span>
          </div>
        </div>
      </div>

      {/* Quickstart Command */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>1. Install & Launch FastAPI</span>
          </div>
          <button
            onClick={() => copyToClipboard(installCmd, 'install')}
            className="text-xs text-indigo-300 hover:text-white flex items-center space-x-1"
          >
            {copiedSection === 'install' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'install' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-indigo-200 overflow-x-auto">
          {installCmd}
        </pre>
      </div>

      {/* Environment Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>2. Environment Variables (.env)</span>
          </div>
          <button
            onClick={() => copyToClipboard(envExample, 'env')}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            {copiedSection === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'env' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto">
          {envExample}
        </pre>
      </div>

      {/* cURL Example */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-800 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>3. Test POST /chat with cURL</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlChat, 'chat')}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            {copiedSection === 'chat' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'chat' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto">
          {curlChat}
        </pre>

        <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-700 block mb-1">Expected JSON Response:</span>
          <pre className="bg-slate-900 text-indigo-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "reply": "I hear how much pressure you are feeling about tomorrow's defense, but you have put so much work into this. Brewing that hot cup of chamomile tea sounds like a wonderful way to ground yourself tonight.",
  "extracted_memories": [
    {
      "memory_type": "emotional_state",
      "content": "Feels anxious about defense presentation tomorrow morning"
    },
    {
      "memory_type": "preference",
      "content": "Sipping warm chamomile tea helps user feel calm"
    }
  ]
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
