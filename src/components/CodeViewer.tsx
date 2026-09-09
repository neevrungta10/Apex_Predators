import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, FileCode, ExternalLink, ShieldCheck } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [code, setCode] = useState<string>('Loading main.py script...');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/files/main.py')
      .then((res) => (res.ok ? res.text() : Promise.reject('Failed to load')))
      .then((text) => setCode(text))
      .catch((err) => {
        console.warn(err);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
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
            <FileCode className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-mono">main.py</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              Complete & Production Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            FastAPI server with CORS, official google-genai SDK, Supabase pgvector, and 4-step memory pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="download-main-py-btn"
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download main.py</span>
          </button>
          <button
            id="copy-main-py-btn"
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Code Container */}
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
            <span className="ml-2 text-slate-300">Python 3.10+ / FastAPI</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {code.split('\n').length} lines
          </span>
        </div>
        <div className="p-4 overflow-x-auto max-h-[640px] text-xs font-mono leading-relaxed text-slate-200 selection:bg-indigo-500 selection:text-white">
          <pre className="whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
