import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FileCheck,
  HardDrive,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  checkStatuses,
  checkTypes,
  credentialStatuses,
  credentialTypes,
  loadRecords,
  storageKey,
  storeRecords,
  type ProviderRecord,
  type RecordDraft,
  type RecordKind,
} from "./records";
import "./credentials.css";

const readError =
  "Saved records could not be read. Existing browser data has been left unchanged.";
const writeError =
  "Could not save to browser storage. Check that local storage is enabled and has space, then try again.";
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function displayDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

function RecordForm({
  kind,
  initial,
  onSave,
  onCancel,
}: {
  kind: RecordKind;
  initial?: ProviderRecord;
  onSave: (draft: RecordDraft) => boolean;
  onCancel: () => void;
}) {
  const types = kind === "credential" ? credentialTypes : checkTypes;
  const statuses = kind === "credential" ? credentialStatuses : checkStatuses;
  const [draft, setDraft] = useState<RecordDraft>(() =>
    initial
      ? { ...initial }
      : {
          kind,
          type: types[0],
          title: "",
          organization: "",
          reference: "",
          status: statuses[0],
          date: "",
          expiresOn: "",
          notes: "",
        },
  );
  const [error, setError] = useState<string | null>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstInput.current?.focus();
  }, []);
  const prefix = `record-${kind}`;
  function field(name: keyof RecordDraft, value: string): void {
    setDraft((current) => ({ ...current, [name]: value }));
  }
  function submit(event: FormEvent): void {
    event.preventDefault();
    if (
      !draft.title.trim() ||
      (kind === "credential" && !draft.organization.trim())
    ) {
      setError("Enter a name and issuing organization for the credential.");
      return;
    }
    if (draft.date && draft.expiresOn && draft.expiresOn < draft.date) {
      setError("Expiry date cannot be earlier than the issue or check date.");
      return;
    }
    setError(null);
    onSave({
      kind,
      type: draft.type,
      title: draft.title.trim(),
      organization: draft.organization.trim(),
      reference: draft.reference.trim(),
      status: draft.status,
      date: draft.date,
      expiresOn: draft.expiresOn,
      notes: draft.notes.trim(),
    });
  }
  return (
    <form
      className="provider-record-form"
      onSubmit={submit}
      aria-label={`${initial ? "Edit" : "Add"} ${kind}`}
    >
      <div className="record-form-heading">
        <h3>
          {initial ? "Edit" : "Add"}{" "}
          {kind === "credential" ? "credential" : "check"}
        </h3>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X size={19} />
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="record-form-grid">
        <div className="field">
          <label htmlFor={`${prefix}-title`}>
            {kind === "credential" ? "Credential name" : "Check name"} *
          </label>
          <input
            id={`${prefix}-title`}
            ref={firstInput}
            value={draft.title}
            onChange={(event) => field("title", event.target.value)}
            maxLength={120}
            placeholder={
              kind === "credential"
                ? "e.g. CPR and First Aid"
                : "e.g. Annual background screening"
            }
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-type`}>Type *</label>
          <select
            id={`${prefix}-type`}
            value={draft.type}
            onChange={(event) => field("type", event.target.value)}
          >
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-organization`}>
            {kind === "credential"
              ? "Issuing organization *"
              : "Agency / organization"}
          </label>
          <input
            id={`${prefix}-organization`}
            value={draft.organization}
            onChange={(event) => field("organization", event.target.value)}
            maxLength={160}
            required={kind === "credential"}
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-reference`}>
            {kind === "credential"
              ? "License / certificate reference"
              : "Check reference"}{" "}
            <span>(optional)</span>
          </label>
          <input
            id={`${prefix}-reference`}
            value={draft.reference}
            onChange={(event) => field("reference", event.target.value)}
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-status`}>Status *</label>
          <select
            id={`${prefix}-status`}
            value={draft.status}
            onChange={(event) => field("status", event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-date`}>
            {kind === "credential"
              ? "Issue date"
              : "Requested / completed date"}{" "}
            <span>(optional)</span>
          </label>
          <input
            id={`${prefix}-date`}
            type="date"
            value={draft.date}
            onChange={(event) => field("date", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-expiry`}>
            Expiry / renewal date <span>(optional)</span>
          </label>
          <input
            id={`${prefix}-expiry`}
            type="date"
            min={draft.date || undefined}
            value={draft.expiresOn}
            onChange={(event) => field("expiresOn", event.target.value)}
          />
        </div>
        <div className="field record-notes-field">
          <label htmlFor={`${prefix}-notes`}>
            Notes <span>(optional)</span>
          </label>
          <textarea
            id={`${prefix}-notes`}
            value={draft.notes}
            onChange={(event) => field("notes", event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
      </div>
      <div className="record-form-actions">
        <button className="primary-button" type="submit">
          {initial ? "Save changes" : `Save ${kind}`}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CredentialsManager({ userId }: { userId: string }) {
  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [storageProblem, setStorageProblem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    kind: RecordKind;
    record?: ProviderRecord;
  } | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  useEffect(() => {
    function refresh(): void {
      try {
        setRecords(loadRecords(userId));
        setStorageProblem(false);
      } catch {
        setStorageProblem(true);
        setError(readError);
      }
    }
    refresh();
    const listen = (event: StorageEvent): void => {
      if (event.key === storageKey(userId) || event.key === null) refresh();
    };
    window.addEventListener("storage", listen);
    return () => window.removeEventListener("storage", listen);
  }, [userId]);

  function open(kind: RecordKind, record?: ProviderRecord): void {
    setEditor({ kind, record });
    setNotice(null);
    setRemoveId(null);
    if (!storageProblem) setError(null);
  }
  function save(draft: RecordDraft): boolean {
    if (storageProblem) {
      setError(readError);
      return false;
    }
    try {
      const current = loadRecords(userId);
      const existing = editor?.record;
      if (existing && !current.some((record) => record.id === existing.id)) {
        setError(
          "This record was removed in another tab. Close the form and add a new record.",
        );
        return false;
      }
      const now = new Date().toISOString();
      const record: ProviderRecord = {
        ...draft,
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const updated = existing
        ? current.map((row) => (row.id === existing.id ? record : row))
        : [...current, record];
      storeRecords(userId, updated);
      setRecords(updated);
      setEditor(null);
      setError(null);
      setNotice(
        `${draft.kind === "credential" ? "Credential" : "Check"} ${existing ? "updated" : "saved"} in this browser.`,
      );
      return true;
    } catch {
      setError(writeError);
      return false;
    }
  }
  function remove(record: ProviderRecord): void {
    try {
      if (storageProblem) {
        setError(readError);
        return;
      }
      const updated = loadRecords(userId).filter((row) => row.id !== record.id);
      storeRecords(userId, updated);
      setRecords(updated);
      setRemoveId(null);
      setError(null);
      if (editor?.record?.id === record.id) setEditor(null);
      setNotice(
        `${record.kind === "credential" ? "Credential" : "Check"} removed from this browser.`,
      );
    } catch {
      setError(writeError);
    }
  }
  function reset(): void {
    try {
      localStorage.removeItem(storageKey(userId));
      setRecords([]);
      setStorageProblem(false);
      setError(null);
      setResetConfirm(false);
      setEditor(null);
      setNotice("Local records cleared for this account.");
    } catch {
      setError(
        "Browser storage is unavailable. Enable it and reload this page.",
      );
    }
  }

  return (
    <div className="credentials-manager">
      <div className="local-storage-note">
        <HardDrive size={20} aria-hidden="true" />
        <p>
          <strong>Saved on this device.</strong> Your records stay in this
          browser for this account. They are self-reported and do not change
          your verification status.
        </p>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
          {storageProblem && (
            <div className="storage-reset-actions">
              {resetConfirm ? (
                <>
                  <span>
                    This removes local credentials and checks for this account.
                  </span>
                  <button type="button" onClick={reset}>
                    Clear local records
                  </button>
                  <button type="button" onClick={() => setResetConfirm(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setResetConfirm(true)}>
                  Reset unreadable local data
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {(["credential", "check"] as const).map((kind) => {
        const items = records.filter((record) => record.kind === kind);
        const Icon = kind === "credential" ? FileCheck : ShieldCheck;
        return (
          <section
            className="provider-record-section"
            key={kind}
            aria-labelledby={`section-${kind}`}
          >
            <div className="provider-section-heading">
              <div>
                <Icon size={23} aria-hidden="true" />
                <div>
                  <h2 id={`section-${kind}`}>
                    {kind === "credential"
                      ? "Professional credentials"
                      : "Checks & screenings"}{" "}
                    <span>{items.length}</span>
                  </h2>
                  <p>
                    {kind === "credential"
                      ? "Keep your licenses, certifications, and training together."
                      : "Track multiple checks and their self-reported progress."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => open(kind)}
                disabled={storageProblem}
              >
                <Plus size={16} aria-hidden="true" />
                Add {kind}
              </button>
            </div>
            {editor?.kind === kind && (
              <RecordForm
                key={editor.record?.id ?? `new-${kind}`}
                kind={kind}
                initial={editor.record}
                onSave={save}
                onCancel={() => setEditor(null)}
              />
            )}
            {items.length ? (
              <div className="provider-record-grid">
                {items.map((record) => {
                  const expired =
                    !!record.expiresOn && record.expiresOn < today();
                  return (
                    <article className="provider-record-card" key={record.id}>
                      <div className="record-card-top">
                        <span>{record.type}</span>
                        <span
                          className={`record-status ${expired ? "expired" : ""}`}
                        >
                          {expired ? "Expired" : record.status}
                        </span>
                      </div>
                      <h3>{record.title}</h3>
                      {record.organization && (
                        <p className="record-organization">
                          {record.organization}
                        </p>
                      )}
                      <dl>
                        {record.reference && (
                          <div>
                            <dt>Reference</dt>
                            <dd>{record.reference}</dd>
                          </div>
                        )}
                        {record.date && (
                          <div>
                            <dt>
                              {kind === "credential" ? "Issued" : "Check date"}
                            </dt>
                            <dd>{displayDate(record.date)}</dd>
                          </div>
                        )}
                        {record.expiresOn && (
                          <div>
                            <dt>Expires / renews</dt>
                            <dd>{displayDate(record.expiresOn)}</dd>
                          </div>
                        )}
                      </dl>
                      {record.notes && (
                        <p className="record-notes">{record.notes}</p>
                      )}
                      {removeId === record.id ? (
                        <div className="record-remove-confirm">
                          <p>Remove this {kind} from this browser?</p>
                          <button type="button" onClick={() => remove(record)}>
                            Remove record
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="record-card-actions">
                          <button
                            type="button"
                            onClick={() => open(kind, record)}
                            aria-label={`Edit ${record.title}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveId(record.id)}
                            aria-label={`Remove ${record.title}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : !editor || editor.kind !== kind ? (
              <div className="records-empty">
                <Icon size={28} strokeWidth={1.4} aria-hidden="true" />
                <p>
                  No {kind === "credential" ? "credentials" : "checks"} added
                  yet.
                </p>
                <span>Use “Add {kind}” to create your first record.</span>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
