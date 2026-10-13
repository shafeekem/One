import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext.js';
import { LayoutDashboard, BellRing, Crosshair, Terminal, Wrench, Menu } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setMobileMenuOpen, mobileMenuOpen } = useApp();

  const primaryItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'soc', label: 'SOC', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: BellRing },
    { id: 'assessments', label: 'Scope', icon: Crosshair },
    { id: 'terminal', label: 'CLI', icon: Terminal },
    { id: 'tools', label: 'Tools', icon: Wrench },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-md px-1 py-1 flex items-center justify-around safe-bottom">
      {primaryItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (mobileMenuOpen) setMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md min-w-[54px] min-h-[48px] text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="font-mono">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md min-w-[54px] min-h-[48px] text-[10px] font-medium transition-colors ${
          mobileMenuOpen ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="font-mono">More</span>
      </button>
    </nav>
  );
};
