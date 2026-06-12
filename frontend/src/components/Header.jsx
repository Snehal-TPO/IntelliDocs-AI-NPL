import { UploadCloud } from "lucide-react";
import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const titles = {
  "/dashboard": "Dashboard",
  "/documents": "Documents",
  "/upload": "Upload Document",
};

const mobileNav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/documents", label: "Documents" },
  { to: "/upload", label: "Upload" },
];

export default function Header() {
  const location = useLocation();
  const title = location.pathname.startsWith("/documents/")
    ? "Document Detail"
    : titles[location.pathname] || "IntelliDocs AI";

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold tracking-tight">{title}</div>
          <div className="hidden text-sm text-slate-500 sm:block">
            Enterprise document intelligence workspace
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 lg:hidden">
            {mobileNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-slate-900 text-white" : "text-slate-600",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/upload"
            className="hidden items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:inline-flex"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Upload
          </Link>
        </div>
      </div>
    </header>
  );
}
