import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { EvidenceItem } from '../../types.js';
import { Archive, ShieldCheck, Plus, CheckCircle2, AlertTriangle, RefreshCw, X, Download } from 'lucide-react';

export const EvidenceVaultView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);

  // New evidence form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ evidence: EvidenceItem[] }>('/evidence');
      setEvidenceList(res.evidence || []);
      if (res.evidence?.length > 0 && !selectedItem) {
        setSelectedItem(res.evidence[0]);
      } else if (selectedItem) {
        const found = res.evidence?.find(e => e.id === selectedItem.id);
        if (found) setSelectedItem(found);
      }
    } catch (err: any) {
      showToast('Failed to load evidence vault: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [activeOrg, refreshKey]);

  const handleVerifyIntegrity = async (itemId: string) => {
    setVerifyingId(itemId);
    try {
      const res = await ApiClient.request<{ verified: boolean; hash: string }>(`/evidence/${itemId}/verify`, {
        method: 'POST',
      });
      if (res.verified) {
        showToast(`Cryptographic Integrity Verified! SHA-256 hash match: ${res.hash.slice(0, 16)}...`, 'success');
      } else {
        showToast('INTEGRITY ALERT: SHA-256 hash mismatch detected!', 'error');
      }
      loadEvidence();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !filename.trim() || !content.trim()) {
      showToast('Title, filename, and artifact content are required', 'error');
      return;
    }

    setUploading(true);
    try {
      const res = await ApiClient.request<{ evidence: EvidenceItem }>('/evidence', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          filename: filename.trim(),
          content: content.trim(),
          classification: 'RESTRICTED',
        }),
      });

      showToast(`Evidence artifact stored! SHA-256 computed: ${res.evidence.sha256Hash.slice(0, 12)}...`, 'success');
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setFilename('');
      setContent('');
      loadEvidence();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Digital Evidence Vault</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Cryptographic SHA-256 hashing</span>
            <span aria-hidden="true">·</span>
            <span>Immutable chain of custody records</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Artifact</span>
          </button>
          <button
            onClick={loadEvidence}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence List */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
            Vault Artifacts ({evidenceList.length})
          </div>

          {evidenceList.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedItem?.id === item.id
                  ? 'bg-slate-800/80 border-cyan-500/50 shadow-md'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-100">{item.title}</h3>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                  {item.classification}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.description}</p>
              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                SHA256: {item.sha256Hash}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Item Details */}
        {selectedItem && (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-semibold text-slate-100">{selectedItem.title}</h2>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 font-mono">
                    File: {selectedItem.filename} · Ingested by {selectedItem.uploadedBy}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`/api/v1/evidence/${selectedItem.id}/download`}
                    download={selectedItem.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Artifact</span>
                  </a>

                  <button
                    onClick={() => handleVerifyIntegrity(selectedItem.id)}
                    disabled={verifyingId === selectedItem.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900 rounded-md transition-colors"
                  >
                    <ShieldCheck className={`w-4 h-4 ${verifyingId === selectedItem.id ? 'animate-spin' : ''}`} />
                    <span>{verifyingId === selectedItem.id ? 'Checking Hash...' : 'Verify Integrity'}</span>
                  </button>
                </div>
              </div>

              {/* Hash Verification Box */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-slate-400 text-[11px] uppercase tracking-wider">
                  Cryptographic Checksum (SHA-256 Digest)
                </div>
                <div className="text-emerald-400 font-bold break-all bg-slate-900/60 p-2 rounded border border-slate-800">
                  {selectedItem.sha256Hash}
                </div>
                <div className="text-slate-400 text-[11px] flex justify-between">
                  <span>Size: {selectedItem.sizeBytes} bytes</span>
                  <span>Classification: {selectedItem.classification}</span>
                </div>
              </div>

              {/* Chain of Custody Audit Log */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Chain of Custody Ledger
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedItem.chainOfCustody.map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-cyan-400 font-semibold">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-slate-300 text-[11px]">
                        Actor: {log.actor} · {log.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Artifact Content Preview */}
              {selectedItem.fileData && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                    Artifact Payload Preview
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedItem.fileData}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 font-mono">Ingest Evidence Artifact</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Artifact Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Memory Hex Dump Segment"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Filename:</label>
                <input
                  type="text"
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="e.g. dump_0x7ffd_beacon.raw"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description:</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Acquisition context or source..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Artifact Content / Data:</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="Paste artifact telemetry, log records, or raw bytes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-3 py-1.5 bg-emerald-400 text-emerald-950 font-bold rounded"
                >
                  {uploading ? 'Computing SHA-256...' : 'Calculate Hash & Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
