import React from "react";
import { useNavigate } from "react-router-dom";

import UploadBox from "../components/UploadBox.jsx";

export default function Upload() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Upload Document</h1>
        <p className="mt-1 text-sm text-slate-500">AI extraction starts after the upload completes.</p>
      </div>
      <UploadBox onUploaded={(document) => navigate(`/documents/${document.id}`)} />
    </div>
  );
}
