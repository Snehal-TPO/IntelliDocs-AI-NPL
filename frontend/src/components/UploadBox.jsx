import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import React, { useRef, useState } from "react";

import { apiErrorMessage, uploadDocument } from "../api.js";

const allowedExtensions = [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"];

export default function UploadBox({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function chooseFile(nextFile) {
    setError("");
    setResult(null);
    if (!nextFile) return;
    const extension = `.${nextFile.name.split(".").pop().toLowerCase()}`;
    if (!allowedExtensions.includes(extension)) {
      setFile(null);
      setError(`Unsupported file type. Allowed: ${allowedExtensions.join(", ")}`);
      return;
    }
    setFile(nextFile);
  }

  async function handleUpload() {
    if (!file) {
      setError("Select a document first.");
      return;
    }
    setIsUploading(true);
    setProgress(0);
    setError("");
    setResult(null);

    try {
      const document = await uploadDocument(file, (event) => {
        if (event.total) {
          setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      setResult(document);
      setFile(null);
      onUploaded?.(document);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div
        className={[
          "flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          chooseFile(event.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={allowedExtensions.join(",")}
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <div className="rounded-lg bg-white p-4 text-blue-600 shadow-sm">
          <UploadCloud className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="mt-5 text-lg font-semibold text-slate-950">
          {file ? file.name : "Select or drop a document"}
        </div>
        <div className="mt-2 text-sm text-slate-500">PDF, DOCX, TXT, PNG, JPG, JPEG</div>
        {file && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        )}
      </div>

      {isUploading && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{result.original_filename} saved with status {result.status}.</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setError("");
            setResult(null);
          }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          disabled={isUploading}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Upload Document
        </button>
      </div>
    </div>
  );
}
