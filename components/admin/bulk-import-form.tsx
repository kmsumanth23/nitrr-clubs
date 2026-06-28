"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  IconUpload,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  bulkImportClubs,
  type BulkImportState,
} from "@/lib/actions/bulk-import";
import { BulkImportResultView } from "@/components/admin/bulk-import-result";

const INITIAL: BulkImportState = { ok: false };

export function BulkImportForm() {
  const [state, formAction, pending] = useActionState(
    bulkImportClubs,
    INITIAL,
  );
  const [filename, setFilename] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFilename(f?.name ?? null);
  }

  return (
    <div className="space-y-6">
      {/* Help panel */}
      <div className="rounded-2xl border border-indigo/20 bg-indigo/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
          <IconInfoCircle size={16} className="text-indigo" />
          Before you upload
        </div>

        <div className="space-y-3 text-xs text-ink-soft">
          <div>
            <span className="font-semibold text-ink">Required columns:</span>{" "}
            <code className="font-mono">name</code>,{" "}
            <code className="font-mono">category_slug</code>,{" "}
            <code className="font-mono">lead_roll_number</code>
          </div>

          <div>
            <span className="font-semibold text-ink">Optional columns:</span>{" "}
            <code className="font-mono">slug</code> (auto-derived from name if blank),{" "}
            <code className="font-mono">tagline</code>,{" "}
            <code className="font-mono">description</code>
          </div>

          <div>
            <div className="mb-1 font-semibold text-ink">Cautions:</div>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>
                Lead profiles <strong>must already exist</strong> — they need to sign up
                first. Bulk import matches them by{" "}
                <code className="font-mono">roll_number</code>, not email.
              </li>
              <li>
                <code className="font-mono">category_slug</code> must match a slug listed in{" "}
                <a
                  href="/admin/sysadmin/categories"
                  className="text-indigo hover:underline"
                >
                  Categories
                </a>
                .
              </li>
              <li>
                Slugs must be globally unique. Specify in the CSV, or let it auto-derive
                from <code className="font-mono">name</code>.
              </li>
              <li>
                Descriptions are <strong>single-line</strong> only — no embedded newlines
                inside quoted fields.
              </li>
              <li>Max 200 rows, 1 MB file size per upload.</li>
              <li>
                Each row is independent — one row failing doesn&apos;t kill the rest.
                You&apos;ll see a per-row report after upload.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Download template */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <h3 className="text-sm font-medium text-ink">1. Download the template</h3>
        <p className="mt-1 mb-3 text-xs text-ink-soft">
          Empty CSV with the right columns + one example row. Fill in real data
          in Excel or Google Sheets, save as CSV, and upload below. Delete the
          example row before uploading.
        </p>
        <a
          href="/admin/api/import/template"
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink hover:border-indigo/30 hover:text-indigo"
        >
          <IconDownload size={13} /> Download template
        </a>
      </div>

      {/* Upload */}
      <form action={formAction} className="rounded-2xl border border-line bg-white p-4">
        <h3 className="text-sm font-medium text-ink">2. Upload your CSV</h3>
        <p className="mt-1 mb-3 text-xs text-ink-soft">
          Each row becomes one new club.
        </p>

        <label className="block">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            onChange={onFileChange}
            className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-3.5 file:py-1.5 file:text-xs file:text-ink hover:file:bg-line"
          />
        </label>

        {filename && (
          <p className="mt-2 text-[11px] text-ink-soft">
            Selected: <span className="font-mono">{filename}</span>
          </p>
        )}

        {!state.ok && "error" in state && state.error && (
          <p className="mt-3 rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !filename}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
        >
          <IconUpload size={13} /> {pending ? "Importing..." : "Import"}
        </button>
      </form>

      {/* Results */}
      {state.ok && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-ink">3. Results</h3>
          <BulkImportResultView report={state} />
        </div>
      )}
    </div>
  );
}
