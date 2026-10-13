import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext.js';
import {
  LayoutDashboard,
  BellRing,
  Flame,
  Server,
  FileText,
  Crosshair,
  Terminal,
  FlaskConical,
  Bug,
  Radio,
  Archive,
  Wrench,
  Cpu,
  FileCheck2,
  Bot,
  History,
  Activity,
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Security Operations',
    items: [
      { id: 'soc', label: 'SOC Overview', icon: LayoutDashboard },
      { id: 'alerts', label: 'Alerts', icon: BellRing },
      { id: 'incidents', label: 'Incidents & Triage', icon: Flame },
      { id: 'assets', label: 'Asset Inventory', icon: Server },
      { id: 'events', label: 'Events & Telemetry', icon: FileText },
    ],
  },
  {
    title: 'Offensive & Scope Control',
    items: [
      { id: 'assessments', label: 'Assessments & Scope', icon: Crosshair },
      { id: 'terminal', label: 'Terminal & CLI', icon: Terminal },
      { id: 'labs', label: 'Isolated Labs', icon: FlaskConical },
    ],
  },
  {
    title: 'Intelligence & Forensics',
    items: [
      { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Bug },
      { id: 'threats', label: 'Threat Intelligence', icon: Radio },
      { id: 'evidence', label: 'Evidence Vault', icon: Archive },
    ],
  },
  {
    title: 'Tools & Execution',
    items: [
      { id: 'tools', label: 'Tool Catalog (18)', icon: Wrench },
      { id: 'workers', label: 'Worker Nodes', icon: Cpu },
    ],
  },
  {
    title: 'Governance & Platform',
    items: [
      { id: 'compliance', label: 'Compliance Posture', icon: FileCheck2 },
      { id: 'assistant', label: 'AI Security Assistant', icon: Bot },
      { id: 'audit', label: 'Audit Trail', icon: History },
      { id: 'health', label: 'System Diagnostics', icon: Activity },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = useApp();

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-[53px] bottom-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 overflow-y-auto transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-6">
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-slate-800/90 text-emerald-400 border border-slate-700/60'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quiet Status Info in Sidebar Footer */}
          <div className="px-3 pt-4 border-t border-slate-900 text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Scope Enforcement: STRICT</div>
            <div>PostgreSQL Engine: ACTIVE</div>
          </div>
        </div>
      </aside>
    </>
  );
};
