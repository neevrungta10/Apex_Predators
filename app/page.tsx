'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUp,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  Headphones,
  Heart,
  Link2,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Music2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react'

type Message = { id: number; role: 'user' | 'assistant'; text: string; time: string }
type Memory = { id: number; kind: 'fact' | 'feeling'; title: string; detail: string; source: string; color: string }

const starterMessages: Message[] = [
  { id: 1, role: 'assistant', text: "Good morning, Maya. I noticed you've been playing a lot of mellow electronic lately. How are you feeling today?", time: '9:42 AM' },
  { id: 2, role: 'user', text: "A little scattered, honestly. I have my first big presentation at 2pm and I can't seem to focus.", time: '9:43 AM' },
  { id: 3, role: 'assistant', text: "That makes sense. You usually feel more grounded after a short walk and something instrumental. Want me to put together a 20-minute focus set before we work through your opening?", time: '9:43 AM' },
]

const defaultMemories: Memory[] = [
  { id: 1, kind: 'fact', title: 'Presentation today', detail: 'First big presentation at 2pm', source: 'Conversation', color: 'sage' },
  { id: 2, kind: 'feeling', title: 'Feeling scattered', detail: 'A little anxious about presenting', source: 'Conversation', color: 'coral' },
  { id: 3, kind: 'fact', title: 'Mellow electronic', detail: 'Often listens when winding down', source: 'Spotify signal', color: 'lilac' },
]

const prompts = ['Help me prepare for my presentation', 'Play something to help me focus', 'What have I been enjoying lately?']

function formatTime() {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>(starterMessages)
  const [memories, setMemories] = useState<Memory[]>(defaultMemories)
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'memory'>('chat')
  const [showSignals, setShowSignals] = useState(true)
  const [connected, setConnected] = useState({ spotify: true, instagram: false })

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('luma-companion')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.messages) setMessages(parsed.messages)
        if (parsed.memories) setMemories(parsed.memories)
      }
    } catch {
      // Keep the curated first-session state if storage is unavailable.
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('luma-companion', JSON.stringify({ messages, memories }))
  }, [messages, memories])

  const contextCount = useMemo(() => Math.min(5, memories.length + 2), [memories.length])

  function sendMessage(text = input) {
    const clean = text.trim()
    if (!clean) return
    const now = formatTime()
    const userMessage: Message = { id: Date.now(), role: 'user', text: clean, time: now }
    const responses = [
      "I’m with you. Let’s make this smaller: start with the one idea your audience should remember, then we’ll shape your opening around it.",
      "I pulled in your recent focus pattern and the presentation note. A short instrumental reset seems like the right next move.",
      "That sounds like a moment worth noticing. You don’t have to solve the whole day right now — just the next ten minutes.",
    ]
    const response = responses[messages.length % responses.length]
    const assistantMessage: Message = { id: Date.now() + 1, role: 'assistant', text: response, time: now }
    setMessages((current) => [...current, userMessage, assistantMessage])
    setMemories((current) => current.some((memory) => memory.title === 'Presentation today') ? current : [...current, defaultMemories[0]])
    setInput('')
  }

  function toggleListening() {
    setIsListening((current) => !current)
    if (isListening) sendMessage('I just finished a voice note')
  }

  function resetSession() {
    setMessages(starterMessages)
    setMemories(defaultMemories)
    window.localStorage.removeItem('luma-companion')
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-5" /></div>
            <div><div className="font-serif text-xl font-semibold tracking-tight">luma</div><div className="text-[11px] text-muted-foreground">your context, remembered</div></div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><div className="size-2 rounded-full bg-accent-teal" /> Memory is active <ChevronDown className="size-4" /></div>
          <div className="flex items-center gap-2"><button aria-label="Search" className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><Search className="size-4" /></button><button aria-label="Settings" className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><Settings2 className="size-4" /></button><div className="ml-1 flex size-9 items-center justify-center rounded-full bg-accent-coral text-sm font-semibold text-foreground">MC</div><button className="md:hidden"><Menu className="size-5" /></button></div>
        </header>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[235px_minmax(0,1fr)_300px]">
          <aside className="hidden flex-col lg:flex">
            <div className="mb-7"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p><nav className="space-y-1"><button onClick={() => setActiveTab('chat')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${activeTab === 'chat' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary'}`}><MessageCircle className="size-4" /> Companion</button><button onClick={() => setActiveTab('memory')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${activeTab === 'memory' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary'}`}><BrainCircuit className="size-4" /> Memory graph <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">{memories.length}</span></button></nav></div>
            <div className="mt-auto rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold">Context health</span><Activity className="size-4 text-accent-teal" /></div><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[82%] rounded-full bg-accent-teal" /></div><p className="text-[11px] leading-relaxed text-muted-foreground">Your memories are focused and up to date.</p><button onClick={resetSession} className="mt-3 text-[11px] font-medium text-muted-foreground underline underline-offset-4">Reset demo data</button></div>
          </aside>

          <section className="flex min-h-[640px] flex-col rounded-[24px] border border-border bg-card shadow-[0_12px_35px_-22px_var(--shadow)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7"><div><p className="font-serif text-lg font-semibold">A Tuesday with Luma</p><p className="mt-0.5 text-xs text-muted-foreground">Today · 9:42 AM</p></div><button onClick={() => setShowSignals(!showSignals)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${showSignals ? 'border-accent-teal/40 bg-accent-teal-soft text-accent-teal-foreground' : 'border-border text-muted-foreground'}`}><Zap className="size-3.5" /> {showSignals ? 'Personalized' : 'Standard'}</button></div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
              {activeTab === 'memory' ? <MemoryView memories={memories} /> : <>{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>{message.role === 'assistant' && <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4" /></div>}<div className={`max-w-[78%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground'}`}>{message.text}</div><span className="mt-1.5 px-1 text-[10px] text-muted-foreground">{message.time}</span></div></div>)}{showSignals && <div className="ml-11 rounded-xl border border-accent-lilac/35 bg-accent-lilac-soft px-4 py-3 text-xs text-muted-foreground"><div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Sparkles className="size-3.5 text-accent-lilac" /> Luma used 5 focused memories</div><span>2 from conversation · 2 from music signals · 1 emotional pattern</span></div>}</>}
            </div>
            <div className="border-t border-border p-4 sm:p-5"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{prompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)} className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground">{prompt}</button>)}</div><div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/50"><button aria-label="Add attachment" className="mb-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary"><Plus className="size-4" /></button><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); sendMessage() } }} placeholder="Talk to Luma..." rows={1} className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground" /><button onClick={toggleListening} aria-label={isListening ? 'Stop listening' : 'Start voice input'} className={`mb-1 rounded-lg p-2 ${isListening ? 'bg-accent-coral text-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>{isListening ? <Volume2 className="size-4" /> : <Mic className="size-4" />}</button><button onClick={() => sendMessage()} aria-label="Send message" className="mb-1 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ArrowUp className="size-4" /></button></div><p className="mt-2 text-center text-[10px] text-muted-foreground">Luma remembers what matters, not everything.</p></div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><p className="font-serif text-base font-semibold">Memory pulse</p><p className="text-[11px] text-muted-foreground">Relevant right now</p></div><button className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><MoreHorizontal className="size-4" /></button></div><div className="mb-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-accent-sage-soft p-3"><p className="text-2xl font-semibold">{contextCount}</p><p className="text-[10px] text-muted-foreground">memories used</p></div><div className="rounded-xl bg-accent-lilac-soft p-3"><p className="text-2xl font-semibold">82%</p><p className="text-[10px] text-muted-foreground">relevance score</p></div></div><div className="space-y-3">{memories.map((memory) => <div key={memory.id} className="flex gap-3"><div className={`mt-1 size-2 shrink-0 rounded-full ${memory.kind === 'feeling' ? 'bg-accent-coral' : 'bg-accent-teal'}`} /><div className="min-w-0"><p className="text-xs font-medium">{memory.title}</p><p className="truncate text-[11px] text-muted-foreground">{memory.detail}</p><p className="mt-1 text-[10px] text-muted-foreground/70">{memory.source}</p></div></div>)}</div><button onClick={() => setActiveTab('memory')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium hover:bg-secondary">Open memory graph <ArrowUp className="size-3 rotate-45" /></button></div>
            <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><p className="font-serif text-base font-semibold">Connected signals</p><p className="text-[11px] text-muted-foreground">Your world, in context</p></div><Link2 className="size-4 text-muted-foreground" /></div><SignalRow icon={<Music2 className="size-4" />} name="Spotify" detail="Listening patterns" connected={connected.spotify} onClick={() => setConnected((current) => ({ ...current, spotify: !current.spotify }))} color="bg-accent-sage-soft" /><SignalRow icon={<Heart className="size-4" />} name="Instagram" detail="Mood & interests" connected={connected.instagram} onClick={() => setConnected((current) => ({ ...current, instagram: !current.instagram }))} color="bg-accent-coral-soft" /></div>
            <div className="rounded-[20px] bg-primary p-4 text-primary-foreground"><div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-primary-foreground/15"><Headphones className="size-4" /></div><p className="font-serif text-lg font-semibold">Try voice mode</p><p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">A more natural way to talk when your hands are busy.</p><button onClick={toggleListening} className="mt-4 rounded-xl bg-primary-foreground px-3 py-2 text-xs font-semibold text-primary hover:opacity-90">{isListening ? 'Listening now' : 'Start a voice note'}</button></div>
          </aside>
        </div>
        <footer className="flex items-center justify-between border-t border-border py-3 text-[10px] text-muted-foreground"><span>Prototype · Dual-layer memory system</span><span className="hidden items-center gap-1 sm:flex"><Clock3 className="size-3" /> Last memory sync just now</span></footer>
      </div>
    </main>
  )
}

function SignalRow({ icon, name, detail, connected, onClick, color }: { icon: React.ReactNode; name: string; detail: string; connected: boolean; onClick: () => void; color: string }) {
  return <div className="mb-3 flex items-center gap-3"><div className={`flex size-8 items-center justify-center rounded-lg ${color}`}>{icon}</div><div className="min-w-0 flex-1"><p className="text-xs font-medium">{name}</p><p className="text-[10px] text-muted-foreground">{detail}</p></div><button onClick={onClick} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${connected ? 'bg-accent-teal-soft text-accent-teal-foreground' : 'border border-border text-muted-foreground'}`}>{connected ? <><Check className="size-3" /> Synced</> : 'Connect'}</button></div>
}

function MemoryView({ memories }: { memories: Memory[] }) {
  return <div className="mx-auto max-w-2xl"><div className="mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-teal">Structured memory</p><h1 className="font-serif text-3xl font-semibold tracking-tight">The things that make <em className="font-normal text-muted-foreground">you</em>, you.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Luma keeps a lightweight map of facts and feelings, then brings forward only what helps in the moment.</p></div><div className="relative grid gap-4 sm:grid-cols-2"><div className="absolute left-1/2 top-1/2 hidden h-px w-16 -translate-x-1/2 bg-border sm:block" />{memories.map((memory) => <div key={memory.id} className="rounded-2xl border border-border bg-background p-5"><div className="mb-5 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${memory.kind === 'feeling' ? 'bg-accent-coral-soft text-accent-coral-foreground' : 'bg-accent-teal-soft text-accent-teal-foreground'}`}>{memory.kind}</span><button className="text-muted-foreground"><X className="size-4" /></button></div><p className="font-serif text-xl font-semibold">{memory.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{memory.detail}</p><div className="mt-5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Link2 className="size-3" /> {memory.source}</div></div>)}</div></div>
}
