import { RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";

import { apiErrorMessage, deleteDocument, getDocuments } from "../api.js";
import DocumentTable from "../components/DocumentTable.jsx";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDocuments() {
    setIsLoading(true);
    setError("");
    try {
      setDocuments(await getDocuments());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(document) {
    const confirmed = window.confirm(`Delete ${document.original_filename}?`);
    if (!confirmed) return;
    setError("");
    try {
      await deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">Stored uploads, processing status, and AI results.</p>
        </div>
        <button
          type="button"
          onClick={loadDocuments}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DocumentTable documents={documents} isLoading={isLoading} onDelete={handleDelete} />
    </div>
  );
}
