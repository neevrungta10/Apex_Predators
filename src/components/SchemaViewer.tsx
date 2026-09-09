import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Database, Layers, CheckCircle } from 'lucide-react';

export const SchemaViewer: React.FC = () => {
  const [schemaSql, setSchemaSql] = useState<string>('Loading supabase_schema.sql...');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/files/supabase_schema.sql')
      .then((res) => (res.ok ? res.text() : Promise.reject('Failed to load')))
      .then((text) => setSchemaSql(text))
      .catch((err) => {
        console.warn(err);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([schemaSql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-mono">supabase_schema.sql</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              PostgreSQL + pgvector
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            SQL schema for table <code className="text-indigo-600 font-mono">memories</code>, HNSW vector cosine index, and <code className="text-indigo-600 font-mono">match_memories</code> RPC function.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="download-schema-btn"
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SQL</span>
          </button>
          <button
            id="copy-schema-btn"
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL!' : 'Copy SQL'}</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="font-semibold text-slate-800 flex items-center space-x-1.5 mb-1">
            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <span>Open Supabase SQL Editor</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Log into your Supabase Dashboard, click SQL Editor on the left sidebar, and click "New query".
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="font-semibold text-slate-800 flex items-center space-x-1.5 mb-1">
            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            <span>Paste & Run Script</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Paste the script below and click Run. It enables pgvector, creates the table, and installs the RPC function.
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="font-semibold text-slate-800 flex items-center space-x-1.5 mb-1">
            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            <span>Add Keys to .env</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Copy Project URL and Service Role Key from Project Settings &gt; API into your local <code className="font-mono text-slate-700">.env</code>.
          </p>
        </div>
      </div>

      {/* Code Container */}
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
            <span className="ml-2 text-slate-300">PostgreSQL (Supabase pgvector)</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {schemaSql.split('\n').length} lines
          </span>
        </div>
        <div className="p-4 overflow-x-auto max-h-[560px] text-xs font-mono leading-relaxed text-emerald-200 selection:bg-emerald-600 selection:text-white">
          <pre className="whitespace-pre">
            <code>{schemaSql}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
