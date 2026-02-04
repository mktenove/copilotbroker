/**
 * CSV Parser utility for lead imports
 * Handles parsing, validation, and normalization of CSV data
 */

export interface ParsedLead {
  name: string;
  whatsapp: string;
  origin?: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  leads: ParsedLead[];
  validCount: number;
  errorCount: number;
  duplicatesInFile: number;
}

// Header aliases for flexible column matching
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "nome completo", "full name", "cliente", "client"],
  whatsapp: ["whatsapp", "telefone", "phone", "celular", "mobile", "tel", "fone", "numero", "number"],
  origin: ["origem", "origin", "fonte", "source", "canal", "channel"],
};

/**
 * Parse CSV text into array of objects
 */
export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });
    
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
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
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Normalize headers to standard field names
 */
export function normalizeHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();
    
    for (const [standardField, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(lowerHeader)) {
        mapping[header] = standardField;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Clean and normalize WhatsApp number to format 55XXXXXXXXXXX
 */
export function cleanWhatsAppNumber(value: string): string {
  // Remove all non-digits
  let cleaned = value.replace(/\D/g, "");
  
  // Handle common formats
  if (cleaned.length === 10 || cleaned.length === 11) {
    // Brazilian number without country code
    cleaned = "55" + cleaned;
  } else if (cleaned.length === 12 || cleaned.length === 13) {
    // Already has country code
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Validate a WhatsApp number
 */
export function isValidWhatsApp(whatsapp: string): boolean {
  const cleaned = cleanWhatsAppNumber(whatsapp);
  // Brazilian mobile: 55 + DDD (2 digits) + 9 + 8 digits = 13 digits
  // Or landline: 55 + DDD (2 digits) + 8 digits = 12 digits
  return cleaned.length >= 12 && cleaned.length <= 13 && cleaned.startsWith("55");
}

/**
 * Validate a name
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Parse and validate CSV data for lead import
 */
export function parseLeadsCsv(csvText: string): CsvParseResult {
  const rows = parseCsvText(csvText);
  const headers = Object.keys(rows[0] || {});
  const headerMapping = normalizeHeaders(headers);
  
  const leads: ParsedLead[] = [];
  const seenWhatsApps = new Set<string>();
  let duplicatesInFile = 0;

  for (const row of rows) {
    // Find values using normalized headers
    let name = "";
    let whatsapp = "";
    let origin = "";

    for (const [originalHeader, normalizedField] of Object.entries(headerMapping)) {
      const value = row[originalHeader] || "";
      
      if (normalizedField === "name") {
        name = value.trim();
      } else if (normalizedField === "whatsapp") {
        whatsapp = cleanWhatsAppNumber(value);
      } else if (normalizedField === "origin") {
        origin = value.trim();
      }
    }

    // Also try direct field access for common variations
    if (!name) {
      name = (row["nome"] || row["name"] || row["Nome"] || row["Name"] || "").trim();
    }
    if (!whatsapp) {
      const rawPhone = row["whatsapp"] || row["telefone"] || row["phone"] || 
                      row["WhatsApp"] || row["Telefone"] || row["Phone"] || "";
      whatsapp = cleanWhatsAppNumber(rawPhone);
    }
    if (!origin) {
      origin = (row["origem"] || row["origin"] || row["Origem"] || row["Origin"] || "").trim();
    }

    const errors: string[] = [];

    // Validate name
    if (!isValidName(name)) {
      errors.push("Nome inválido ou vazio");
    }

    // Validate WhatsApp
    if (!whatsapp) {
      errors.push("WhatsApp vazio");
    } else if (!isValidWhatsApp(whatsapp)) {
      errors.push("WhatsApp inválido");
    }

    // Check for duplicates in file
    if (whatsapp && seenWhatsApps.has(whatsapp)) {
      duplicatesInFile++;
      errors.push("Duplicado no arquivo");
    } else if (whatsapp) {
      seenWhatsApps.add(whatsapp);
    }

    leads.push({
      name,
      whatsapp,
      origin: origin || undefined,
      isValid: errors.length === 0,
      errors,
    });
  }

  return {
    leads,
    validCount: leads.filter((l) => l.isValid).length,
    errorCount: leads.filter((l) => !l.isValid).length,
    duplicatesInFile,
  };
}

/**
 * Generate a sample CSV template
 */
export function generateCsvTemplate(): string {
  return `nome,whatsapp,origem
João Silva,51999887766,Indicação
Maria Santos,51987654321,
Pedro Costa,11998765432,Meta ADS`;
}

/**
 * Download CSV template
 */
export function downloadCsvTemplate(): void {
  const content = generateCsvTemplate();
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
