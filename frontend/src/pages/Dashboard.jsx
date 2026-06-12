import { RefreshCw, UploadCloud } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiErrorMessage, getAnalyticsSummary } from "../api.js";
import DashboardCards from "../components/DashboardCards.jsx";
import DocumentTable from "../components/DocumentTable.jsx";

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setIsLoading(true);
    setError("");
    try {
      setAnalytics(await getAnalyticsSummary());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Document Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Processing activity and document intelligence metrics.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Quick Upload
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DashboardCards analytics={analytics || {}} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Uploads</h2>
          </div>
          <DocumentTable documents={analytics?.recent_uploads || []} isLoading={isLoading} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Documents By Type</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(analytics?.documents_by_type || {}).length ? (
              Object.entries(analytics.documents_by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-4">
                  <span className="truncate text-sm text-slate-600">{type}</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-900">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No classification data yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
