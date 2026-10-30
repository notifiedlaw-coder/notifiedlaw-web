/**
 * Error codes for My Files. The page never shows why something failed: it says "An error has occurred please try
 * again later" and one of these codes, which support maps back to the cause here. The APIs answer `{ code }` only.
 * Server-only, so the meanings never ship to the browser. Codes starting N are raised in the browser; H<status> is
 * an HTTP failure that carried no code (H429: the shared rate limiter).
 */
export const ERROR_CODES = {
  N001: "Could not reach the server (offline or the request was cut off)",
  N002: "Chosen file is not .pdf or .docx (checked in the browser)",
  N003: "Chosen file is over MAX_FILE_BYTES (checked in the browser)",
  N004: "Chosen file does not fit in the storage left (checked in the browser)",

  A001: "Not signed in",

  U101: "No plan, so My Files is unavailable",
  U102: "File name does not end in .pdf or .docx",
  U103: "File is over MAX_FILE_BYTES",
  U104: "Bytes are not a PDF or DOCX (empty, old .doc, other type)",
  U105: "PDF failed the content check (src/lib/file-check.ts); the reason is in the Worker log",
  U106: "DOCX failed the content check (src/lib/file-check.ts); the reason is in the Worker log",
  U107: "Daily upload allowance used up (DAILY_UPLOADS or DAILY_UPLOAD_BYTES)",
  U108: "Virus scanner unavailable or errored",
  U109: "Virus scanner found malware",
  U110: "Name says one type but the bytes are another",
  U111: "Target folder not found",
  U112: "Storage quota full",
  U113: "Writing to R2 failed",

  M201: "File not found",
  M202: "Rename to an empty name",
  M203: "Move target folder not found",
  M204: "Nothing to change",

  D301: "No plan, so folders are unavailable",
  D302: "Folder name empty",
  D303: "MAX_FOLDERS reached",
  D304: "Parent folder not found",
  D305: "Nesting past MAX_FOLDER_DEPTH",
  D306: "A folder with that name already exists in the same place",
  D307: "Folder not found",
  D308: "Moving a folder inside itself",
  D309: "Nothing to change",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** An API failure: the code and status only, never the reason. */
export const apiError = (code: ErrorCode, status: number) => Response.json({ code }, { status, headers: { "cache-control": "private, no-store" } });
