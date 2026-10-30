import type { ErrorCode } from "@/lib/error-codes";
import type { CompareFailure } from "@/lib/compare";

/** The error code and HTTP status for each way a comparison can fail. */
export const FAILURES: Record<CompareFailure, [ErrorCode, number]> = {
  bad: ["C101", 400], missing: ["C102", 404], limit: ["C103", 429], unavailable: ["C104", 503], garbled: ["C105", 502],
};

/** A case id (a Notion page id) from untrusted input, or null. */
export const caseId = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{32,36}$/i.test(v) ? v : null);
