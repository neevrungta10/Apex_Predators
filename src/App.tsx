import React, { useState } from 'react';
import { Header } from './components/Header';
import { PipelineTester } from './components/PipelineTester';
import { CodeViewer } from './components/CodeViewer';
import { SchemaViewer } from './components/SchemaViewer';
import { ApiDocs } from './components/ApiDocs';
import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'simulator' && <PipelineTester />}
        {activeTab === 'code' && <CodeViewer />}
        {activeTab === 'schema' && <SchemaViewer />}
        {activeTab === 'docs' && <ApiDocs />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          PS4: Personalized Voice AI Companion • Powered by Google GenAI (gemini-3.6-flash) &amp; Supabase pgvector
        </p>
      </footer>
    </div>
  );
}
