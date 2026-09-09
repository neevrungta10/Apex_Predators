import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Database,
  Brain,
  Volume2,
  VolumeX,
  Trash2,
  CheckCircle2,
  Info,
  Clock,
  Heart,
  Tag,
  Lightbulb
} from 'lucide-react';
import { ChatMessage, MemoryItem, StoredMemoryRecord } from '../types';

export const PipelineTester: React.FC = () => {
  const [userId, setUserId] = useState<string>('hackathon_user_01');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'companion',
      text: "Hello! I am your personalized voice companion. Tell me about your day, what's on your mind, or what you're working on.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [storedMemories, setStoredMemories] = useState<StoredMemoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [lastExtracted, setLastExtracted] = useState<MemoryItem[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch stored memories for current user
  const fetchMemories = async () => {
    try {
      const res = await fetch(`/api/memories/${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setStoredMemories(data);
      }
    } catch (e) {
      console.warn('Could not fetch memories:', e);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Text to speech playback
  const speakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);
    setActiveStep(1); // Step A

    try {
      // Simulate pipeline progression indicator
      const stepTimer1 = setTimeout(() => setActiveStep(2), 600); // Step B
      const stepTimer2 = setTimeout(() => setActiveStep(3), 1200); // Step C
      const stepTimer3 = setTimeout(() => setActiveStep(4), 1800); // Step D

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: textToSend.trim(),
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await res.json();
      setActiveStep(4);

      if (res.ok) {
        setLastExtracted(data.extracted_memories || []);
        const companionMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'companion',
          text: data.reply || "I'm right here with you.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          extractedMemories: data.extracted_memories || [],
          retrievedMemoriesCount: data.total_stored_memories || 0,
        };
        setMessages((prev) => [...prev, companionMsg]);
        await fetchMemories();
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          sender: 'companion',
          text: `Error from companion backend: ${data.error || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'companion',
        text: `Connection error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => setActiveStep(0), 1000);
    }
  };

  const handleClearMemories = async () => {
    try {
      await fetch(`/api/memories/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setStoredMemories([]);
      setLastExtracted([]);
    } catch (e) {
      console.error('Failed to clear memories:', e);
    }
  };

  const samplePrompts = [
    {
      title: 'Exam Stress + Calming Tea',
      text: "I'm feeling really stressed about my calculus exam tomorrow, but drinking hot peppermint tea always helps me calm down.",
    },
    {
      title: 'Robotics Project Fact',
      text: "I spent 6 hours in the lab today building our team's autonomous delivery rover for the hackathon showcase.",
    },
    {
      title: 'Music & Focus Preference',
      text: "Whenever I write code late at night, I listen to ambient lo-fi music with the lights dimmed.",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left / Main Chat Section */}
      <div className="lg:col-span-8 space-y-4">
        {/* User context banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Active User Context</div>
              <div className="flex items-center space-x-2">
                <input
                  id="user-id-input"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="text-sm font-semibold text-slate-900 border border-slate-300 rounded px-2 py-0.5 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  title="Change active user ID to test multi-user memory separation"
                />
                <span className="text-xs text-slate-400">({storedMemories.length} stored memories)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="clear-memories-btn"
              onClick={handleClearMemories}
              disabled={storedMemories.length === 0}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Memories</span>
            </button>
          </div>
        </div>

        {/* 4-Step Pipeline Status Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-300 mb-2.5 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>FastAPI POST /chat 4-Step Execution Cycle</span>
            </span>
            {loading && <span className="text-[11px] text-indigo-300 animate-pulse">Processing pipeline...</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div
              className={`p-2 rounded-lg border transition-all ${
                activeStep === 1
                  ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <span>Step A: Extraction</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Gemini categorizes memories</p>
            </div>

            <div
              className={`p-2 rounded-lg border transition-all ${
                activeStep === 2
                  ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <span>Step B: Storage</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Insert to Supabase memories</p>
            </div>

            <div
              className={`p-2 rounded-lg border transition-all ${
                activeStep === 3
                  ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <span>Step C: Retrieval</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Query pgvector & user context</p>
            </div>

            <div
              className={`p-2 rounded-lg border transition-all ${
                activeStep === 4
                  ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-xs'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <span>Step D: Generation</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Voice-first persona response</p>
            </div>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[480px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[11px] font-medium text-slate-400">{msg.timestamp}</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {msg.sender === 'user' ? 'You' : 'PS4 Voice Companion'}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Speech synthesis play button for companion messages */}
                  {msg.sender === 'companion' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <button
                        onClick={() => speakText(msg.text, msg.id)}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white/80 hover:bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs transition-colors"
                      >
                        {speakingId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-red-500" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Speak Aloud</span>
                          </>
                        )}
                      </button>

                      {msg.retrievedMemoriesCount !== undefined && (
                        <span className="text-[11px] text-slate-400">
                          Recalled {msg.retrievedMemoriesCount} memories
                        </span>
                      )}
                    </div>
                  )}

                  {/* Show newly extracted memories on this turn */}
                  {msg.extractedMemories && msg.extractedMemories.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Extracted Key Memories (Step A & B):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.extractedMemories.map((m, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              m.memory_type === 'fact'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : m.memory_type === 'emotional_state'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span className="capitalize font-semibold mr-1">[{m.memory_type}]:</span>
                            {m.content}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start space-y-1">
                <span className="text-xs font-semibold text-slate-500">PS4 Voice Companion</span>
                <div className="bg-slate-100 rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-200 flex items-center space-x-2 text-slate-500 text-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-xs ml-1">Analyzing memories & thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Scenario Buttons */}
          <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center space-x-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Try:</span>
            </span>
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p.text)}
                disabled={loading}
                className="text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-2.5 py-1 rounded-full text-slate-600 transition-colors shrink-0 disabled:opacity-50"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                id="message-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type what you want to tell your voice companion..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-indigo-500 focus:bg-white transition-colors"
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right / Memory Bank Inspector */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">User Memory Bank</h2>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {storedMemories.length} records
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Persisted in Supabase PostgreSQL under table <code className="text-indigo-600 font-mono">memories</code> with pgvector semantic similarity.
          </p>

          {storedMemories.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No memories stored yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Send a message with feelings, facts, or habits to trigger Step A & B!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {storedMemories.map((mem) => {
                const typeColor =
                  mem.memory_type === 'fact'
                    ? 'border-l-blue-500 bg-blue-50/40 text-blue-900'
                    : mem.memory_type === 'emotional_state'
                    ? 'border-l-rose-500 bg-rose-50/40 text-rose-900'
                    : 'border-l-emerald-500 bg-emerald-50/40 text-emerald-900';

                return (
                  <div
                    key={mem.id}
                    className={`border border-slate-200 border-l-4 ${typeColor} p-2.5 rounded-lg text-xs space-y-1 shadow-2xs`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        {mem.memory_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(mem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-snug">{mem.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Memory category explanation */}
          <div className="mt-4 pt-4 border-t border-slate-200 text-[11px] space-y-1.5 text-slate-500">
            <div className="font-semibold text-slate-700">Category Schema:</div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>fact</strong>: situational or biographical truths</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span><strong>emotional_state</strong>: moods, feelings, stress levels</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span><strong>preference</strong>: likes, calming rituals, habits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
