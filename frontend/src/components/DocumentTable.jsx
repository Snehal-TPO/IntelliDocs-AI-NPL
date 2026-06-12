import { Eye, Trash2 } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

export default function DocumentTable({ documents, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="text-sm font-semibold text-slate-900">No documents yet</div>
        <div className="mt-1 text-sm text-slate-500">Uploaded documents will appear here.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>File Name</Th>
              <Th>Type</Th>
              <Th>Upload Date</Th>
              <Th>Confidence</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-slate-50">
                <Td>
                  <div className="max-w-xs truncate font-medium text-slate-950">
                    {document.original_filename}
                  </div>
                  <div className="text-xs uppercase text-slate-400">{document.file_type}</div>
                </Td>
                <Td>{document.document_type || "Unknown"}</Td>
                <Td>{formatDate(document.created_at)}</Td>
                <Td>{formatConfidence(document.confidence_score)}</Td>
                <Td>
                  <StatusBadge status={document.status} />
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/documents/${document.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(document)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <th className={`px-4 py-3 ${alignClass} text-xs font-semibold uppercase tracking-wide text-slate-500`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return <td className={`whitespace-nowrap px-4 py-4 ${alignClass} text-slate-700`}>{children}</td>;
}

export function StatusBadge({ status }) {
  const palette = status === "processed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status?.startsWith("failed")
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "processing"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${palette}`}>
      {humanize(status)}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatConfidence(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(Number(value) * 100)}%`;
}

function humanize(value = "") {
  return value.replaceAll("_", " ");
}
