import { Activity, BadgeCheck, Files, Layers3 } from "lucide-react";
import React from "react";

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export default function DashboardCards({ analytics }) {
  const byType = analytics?.documents_by_type || {};
  const typeCount = Object.keys(byType).length;
  const cards = [
    {
      label: "Documents Processed",
      value: analytics?.total_documents ?? 0,
      icon: Files,
      accent: "text-blue-600 bg-blue-50",
    },
    {
      label: "Document Types",
      value: typeCount,
      icon: Layers3,
      accent: "text-violet-600 bg-violet-50",
    },
    {
      label: "Average Confidence",
      value: formatPercent(analytics?.average_confidence),
      icon: BadgeCheck,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Processed Statuses",
      value: Object.keys(analytics?.status_counts || {}).length,
      icon: Activity,
      accent: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-500">{card.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {card.value}
                </div>
              </div>
              <div className={`rounded-lg p-2.5 ${card.accent}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
