"use client";

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5 sm:gap-1 sm:p-1"
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={`${tab.id}-${index}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
