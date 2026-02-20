/**
 * CSV Parser & Phone Normalizer for Lead Import
 * Supports Google Contacts CSV, configurable delimiter, auto-mapping, UAZAPI phone normalization
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface PhoneNormResult {
  normalized: string;
  original: string;
  wasFixed: boolean;
  fixDescription: string;
  isValid: boolean;
  error: string;
}

export interface RowValidation {
  name: string;
  phone: string;
  phoneResult: PhoneNormResult;
  origin: string;
  isValid: boolean;
  errors: string[];
  rowIndex: number;
}

export interface ImportProcessResult {
  totalRows: number;
  validRows: RowValidation[];
  invalidRows: RowValidation[];
  phonesFixed: RowValidation[];
  duplicatesInFile: number;
  duplicateRows: RowValidation[];
}

export interface FieldMapping {
  nameColumns: string[];       // 1 or 2 columns to concat as name
  phoneColumn: string;         // single column for phone
  originColumn: string | null; // optional
}

// ── Delimiter Detection ────────────────────────────────────────────────

export function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

// ── CSV Parser ─────────────────────────────────────────────────────────

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvText(text: string, delimiter?: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };

  const sep = delimiter || detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], sep);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line, sep);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = sanitizeString(values[idx] || "");
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ── Sanitization ───────────────────────────────────────────────────────

function sanitizeString(val: string): string {
  // Remove control characters except newline/tab, then trim
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

// ── Auto-detect Mapping ────────────────────────────────────────────────

const NAME_ALIASES = [
  "first name", "last name", "name", "nome", "nome completo", "full name",
  "given name", "family name", "additional name", "primeiro nome", "sobrenome",
];
const PHONE_ALIASES = [
  "phone 1 - value", "phone 2 - value", "phone 3 - value",
  "phone", "telefone", "whatsapp", "celular", "mobile", "tel", "fone",
  "numero", "number", "phone number", "mobile phone",
];
const ORIGIN_ALIASES = [
  "origem", "origin", "source", "canal", "channel", "group membership",
];

export function autoDetectMapping(headers: string[]): FieldMapping {
  const lower = headers.map(h => h.toLowerCase().trim());

  // Name: try to find first+last, fallback to single name column
  const nameColumns: string[] = [];
  const firstNameIdx = lower.findIndex(h => h === "first name" || h === "given name" || h === "primeiro nome");
  const lastNameIdx = lower.findIndex(h => h === "last name" || h === "family name" || h === "sobrenome");

  if (firstNameIdx !== -1) {
    nameColumns.push(headers[firstNameIdx]);
    if (lastNameIdx !== -1) nameColumns.push(headers[lastNameIdx]);
  } else {
    const nameIdx = lower.findIndex(h => NAME_ALIASES.includes(h));
    if (nameIdx !== -1) nameColumns.push(headers[nameIdx]);
  }

  // Phone: find first matching
  let phoneColumn = "";
  const phoneIdx = lower.findIndex(h => PHONE_ALIASES.includes(h));
  if (phoneIdx !== -1) phoneColumn = headers[phoneIdx];

  // Origin
  let originColumn: string | null = null;
  const originIdx = lower.findIndex(h => ORIGIN_ALIASES.includes(h));
  if (originIdx !== -1) originColumn = headers[originIdx];

  return { nameColumns, phoneColumn, originColumn };
}

// ── Phone Normalization (UAZAPI) ───────────────────────────────────────

export function normalizePhone(input: string, autoFix9thDigit: boolean = true): PhoneNormResult {
  const original = input;
  let digits = input.replace(/\D/g, "");

  // Empty
  if (!digits) {
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Telefone vazio" };
  }

  // Remove leading "00" (international dialing prefix)
  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  // Remove leading "+" artifacts (already stripped by \D removal)
  // Add country code 55 if missing
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = "55" + digits;
  }

  // Already has 55 prefix
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    // OK
  } else if (digits.length === 8 || digits.length === 9) {
    // No DDD
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Sem DDD — precisa incluir DDD" };
  } else if (digits.length < 8) {
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Número muito curto" };
  } else if (digits.length > 13) {
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Número muito longo" };
  } else if (!digits.startsWith("55")) {
    // Unknown format, try to work with it
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Formato não reconhecido" };
  }

  // 9th digit rule: if 12 digits with 55 prefix (55 + DDD(2) + 8 digits = 12),
  // and the local number starts with [6-9], it's likely a cell missing the 9
  let wasFixed = false;
  let fixDescription = "";

  if (digits.length === 12 && digits.startsWith("55") && autoFix9thDigit) {
    const ddd = digits.substring(2, 4);
    const localNumber = digits.substring(4);
    // Brazilian mobile numbers start with 9 after DDD; old format started with [6-9]
    if (/^[6-9]/.test(localNumber)) {
      digits = "55" + ddd + "9" + localNumber;
      wasFixed = true;
      fixDescription = `Inserido 9º dígito: 55${ddd}${localNumber} → ${digits}`;
    }
  }

  // Final validation: must be 12 or 13 digits starting with 55
  if (digits.length < 12 || digits.length > 13 || !digits.startsWith("55")) {
    return { normalized: "", original, wasFixed: false, fixDescription: "", isValid: false, error: "Formato final inválido" };
  }

  return { normalized: digits, original, wasFixed, fixDescription, isValid: true, error: "" };
}

// ── Row Processing ─────────────────────────────────────────────────────

export function extractName(row: Record<string, string>, nameColumns: string[]): string {
  return nameColumns
    .map(col => (row[col] || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function processImportData(
  rows: Record<string, string>[],
  mapping: FieldMapping,
  options: { autoFix9thDigit: boolean; defaultOrigin: string }
): ImportProcessResult {
  const validRows: RowValidation[] = [];
  const invalidRows: RowValidation[] = [];
  const phonesFixed: RowValidation[] = [];
  const duplicateRows: RowValidation[] = [];
  const seenPhones = new Set<string>();
  let duplicatesInFile = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = extractName(row, mapping.nameColumns);
    const rawPhone = mapping.phoneColumn ? (row[mapping.phoneColumn] || "") : "";
    const origin = mapping.originColumn ? (row[mapping.originColumn] || "").trim() : "";
    const phoneResult = normalizePhone(rawPhone, options.autoFix9thDigit);

    const errors: string[] = [];
    if (!name || name.length < 2) errors.push("Nome inválido ou vazio");
    if (!phoneResult.isValid) errors.push(phoneResult.error || "Telefone inválido");

    // Check file duplicates
    let isDuplicate = false;
    if (phoneResult.isValid && phoneResult.normalized) {
      if (seenPhones.has(phoneResult.normalized)) {
        isDuplicate = true;
        duplicatesInFile++;
      } else {
        seenPhones.add(phoneResult.normalized);
      }
    }

    const validation: RowValidation = {
      name,
      phone: phoneResult.normalized,
      phoneResult,
      origin: origin || options.defaultOrigin,
      isValid: errors.length === 0 && !isDuplicate,
      errors,
      rowIndex: i + 1,
    };

    if (isDuplicate) {
      validation.errors.push("Duplicado no arquivo");
      validation.isValid = false;
      duplicateRows.push(validation);
    }

    if (phoneResult.wasFixed) phonesFixed.push(validation);

    if (errors.length > 0) {
      invalidRows.push(validation);
    } else if (!isDuplicate) {
      validRows.push(validation);
    }
  }

  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    phonesFixed,
    duplicatesInFile,
    duplicateRows,
  };
}

// ── CSV Template ───────────────────────────────────────────────────────

export function downloadCsvTemplate(): void {
  const content = `nome,whatsapp,origem\nJoão Silva,51999887766,Indicação\nMaria Santos,51987654321,\nPedro Costa,11998765432,Meta ADS`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template-leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
