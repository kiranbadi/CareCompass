export const credentialTypes = [
  "Professional license",
  "Certification",
  "Training",
  "Education",
  "Other",
] as const;
export const checkTypes = [
  "Background check",
  "Identity check",
  "Reference check",
  "Professional registry check",
  "Other",
] as const;
export const credentialStatuses = [
  "In progress",
  "Held (self-reported)",
  "Not current",
] as const;
export const checkStatuses = [
  "Not started",
  "Requested",
  "In progress",
  "Completed (self-reported)",
  "Needs attention",
] as const;
export type RecordKind = "credential" | "check";
export interface ProviderRecord {
  id: string;
  kind: RecordKind;
  type: string;
  title: string;
  organization: string;
  reference: string;
  status: string;
  date: string;
  expiresOn: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export type RecordDraft = Omit<
  ProviderRecord,
  "id" | "createdAt" | "updatedAt"
>;
export const storageKey = (userId: string): string =>
  `carebridge:provider-records:v1:${encodeURIComponent(userId)}`;

function validRecord(value: unknown): value is ProviderRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const fields = [
    "id",
    "type",
    "title",
    "organization",
    "reference",
    "status",
    "date",
    "expiresOn",
    "notes",
    "createdAt",
    "updatedAt",
  ];
  if (!fields.every((field) => typeof row[field] === "string")) return false;
  if (row.kind !== "credential" && row.kind !== "check") return false;
  const types: readonly string[] =
    row.kind === "credential" ? credentialTypes : checkTypes;
  const statuses: readonly string[] =
    row.kind === "credential" ? credentialStatuses : checkStatuses;
  return (
    types.includes(row.type as string) &&
    statuses.includes(row.status as string) &&
    !!row.id &&
    !!row.title
  );
}

export function loadRecords(userId: string): ProviderRecord[] {
  const raw = localStorage.getItem(storageKey(userId));
  if (raw === null) return [];
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== "object")
    throw new Error("Invalid saved records");
  const document = saved as { version?: unknown; records?: unknown };
  if (
    document.version !== 1 ||
    !Array.isArray(document.records) ||
    !document.records.every(validRecord)
  ) {
    throw new Error("Invalid saved records");
  }
  if (
    new Set(document.records.map((record) => record.id)).size !==
    document.records.length
  )
    throw new Error("Duplicate saved records");
  return document.records;
}
export function storeRecords(userId: string, records: ProviderRecord[]): void {
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({ version: 1, records }),
  );
}
