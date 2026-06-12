import { ArrowLeft, ClipboardList, FileText, Layers3 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiErrorMessage, getDocument } from "../api.js";
import ChatPanel from "../components/ChatPanel.jsx";
import { StatusBadge } from "../components/DocumentTable.jsx";

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      setError("");
      try {
        setDocument(await getDocument(id));
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadDocument();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-44 animate-pulse rounded bg-slate-200" />
        <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="space-y-6">
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Documents
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
              {document.original_filename}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-4 w-4" aria-hidden="true" />
                {document.file_type?.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                {document.document_type || "Unknown"}
              </span>
              <span>{formatConfidence(document.confidence_score)}</span>
            </div>
          </div>
          <StatusBadge status={document.status} />
        </div>

        {document.classification_reason && (
          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {document.classification_reason}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <SummaryCard summary={document.summary} />
          <JsonCard title="Extracted Fields" value={document.extracted_fields} />
          <RawTextCard text={document.extracted_text} />
        </div>
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-950">Processing</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Status" value={document.status?.replaceAll("_", " ")} />
              <InfoRow label="Chunks" value={document.chunks_count ?? 0} />
              <InfoRow label="Created" value={formatDate(document.created_at)} />
              <InfoRow label="Updated" value={formatDate(document.updated_at)} />
            </dl>
          </section>
          <ChatPanel documentId={document.id} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ summary = {} }) {
  const hasData = summary && Object.keys(summary).length > 0;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Summary</h2>
      {!hasData ? (
        <EmptyBlock text="No summary available." />
      ) : summary.error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary.error}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {summary.executive_summary && (
            <p className="text-sm leading-6 text-slate-700">{summary.executive_summary}</p>
          )}
          <ListBlock title="Key Points" items={summary.key_points} />
          <ListBlock title="Action Items" items={summary.action_items} />
          <ListBlock title="Risks Or Missing Information" items={summary.risks_or_missing_information} />
        </div>
      )}
    </section>
  );
}

function JsonCard({ title, value }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {value && Object.keys(value).length ? (
        <pre className="mt-4 max-h-[460px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <EmptyBlock text="No fields extracted." />
      )}
    </section>
  );
}

function RawTextCard({ text }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Raw Extracted Text</h2>
      {text ? (
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {text}
        </pre>
      ) : (
        <EmptyBlock text="No text extracted." />
      )}
    </section>
  );
}

function ListBlock({ title, items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value || "-"}</dd>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatConfidence(value) {
  if (value === null || value === undefined) return "Confidence -";
  return `Confidence ${Math.round(Number(value) * 100)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
