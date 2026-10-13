import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Bot, Send, Sparkles, RefreshCw, ShieldCheck, Copy, Terminal } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: string;
  timestamp: string;
}

export const AssistantView: React.FC = () => {
  const { showToast, setActiveTab } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-0',
      sender: 'assistant',
      text: `### JUPITER Defensive AI Assistant Initialized\nI can assist you with:\n- Triage & root-cause analysis for high-confidence alerts\n- Incident containment & eradication playbooks\n- Remediation guidance for CVE-2024-6387 & CVE-2023-44487\n- Scope boundary validation & defensive terminal commands\n\nHow can I support your operations today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'Explain the SSH brute-force spray on edge-gw-01 (alt-101) and suggest containment',
    'How do I remediate CVE-2024-6387 regreSSHion on Debian 12?',
    'What are the containment steps for DNS tunneling alert alt-102?',
    'Explain why target 10.0.4.254 is blocked by the Scope Engine',
  ];

  const handleSend = async (queryText: string) => {
    const text = queryText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await ApiClient.request<{ success: boolean; reply: string; provider: string }>('/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: text }),
      });

      const assistantMsg: ChatMessage = {
        id: 'a-' + Date.now(),
        sender: 'assistant',
        text: res.reply,
        provider: res.provider,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast('Assistant request failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight font-mono flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <span>AI Defensive Security Assistant</span>
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Server-side defensive reasoning</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Flash &amp; Local Policy Guard</span>
          </div>
        </div>

        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Chat</span>
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono text-slate-300">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 whitespace-nowrap shrink-0 transition-colors"
          >
            {p.slice(0, 42)}...
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 min-h-[440px] max-h-[600px] overflow-y-auto font-mono text-xs md:text-sm">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-2xl p-4 rounded-xl space-y-1.5 ${
                m.sender === 'user'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 leading-relaxed'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                <span>{m.sender === 'user' ? 'Operator Query' : 'JUPITER AI Model'}</span>
                <div className="flex items-center gap-2">
                  {m.provider && <span className="text-cyan-400">[{m.provider}]</span>}
                  {m.sender === 'assistant' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.text);
                        showToast('Response copied to clipboard', 'success');
                      }}
                      className="hover:text-slate-200 text-slate-400 p-0.5"
                      title="Copy response"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{m.text}</div>

              {m.sender === 'assistant' && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2 text-[10px] text-slate-400">
                  <button
                    onClick={() => setActiveTab('terminal')}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Open in Terminal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs animate-pulse">
            <Bot className="w-4 h-4 animate-spin" />
            <span>Generating defensive cybersecurity analysis...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend(inputVal);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Ask for alert root cause, CVE remediation, or playbook..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={loading || !inputVal.trim()}
          className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-cyan-950 font-bold font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
