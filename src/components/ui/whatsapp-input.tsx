import { forwardRef, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
  { code: "55", flag: "🇧🇷", name: "Brasil", format: true, maxDigits: 13 },
  { code: "1", flag: "🇺🇸", name: "Estados Unidos", format: false, maxDigits: 11 },
  { code: "351", flag: "🇵🇹", name: "Portugal", format: false, maxDigits: 12 },
  { code: "54", flag: "🇦🇷", name: "Argentina", format: false, maxDigits: 13 },
  { code: "598", flag: "🇺🇾", name: "Uruguai", format: false, maxDigits: 12 },
  { code: "595", flag: "🇵🇾", name: "Paraguai", format: false, maxDigits: 12 },
  { code: "56", flag: "🇨🇱", name: "Chile", format: false, maxDigits: 12 },
  { code: "57", flag: "🇨🇴", name: "Colômbia", format: false, maxDigits: 12 },
  { code: "52", flag: "🇲🇽", name: "México", format: false, maxDigits: 12 },
] as const;

type Country = (typeof COUNTRIES)[number];

interface WhatsAppInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  showFormatted?: boolean;
}

function findCountryByCode(rawValue: string): Country {
  // Try longest code first (3 digits, then 2, then 1)
  for (const len of [3, 2, 1]) {
    const prefix = rawValue.slice(0, len);
    const found = COUNTRIES.find(c => c.code === prefix);
    if (found) return found;
  }
  return COUNTRIES[0]; // default Brazil
}

/**
 * Formats a Brazilian number for display: (XX) XXXXX-XXXX
 */
function formatBrazilLocal(localNumber: string): string {
  if (localNumber.length <= 2) return localNumber;
  if (localNumber.length <= 7) return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2)}`;
  return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 7)}-${localNumber.slice(7, 11)}`;
}

/**
 * Formats a WhatsApp number for display: +55 (XX) XXXXX-XXXX
 */
export function formatWhatsAppDisplay(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";

  const country = findCountryByCode(numbers);
  const localNumber = numbers.slice(country.code.length);

  if (country.code === "55" && localNumber.length > 0) {
    return `+55 ${formatBrazilLocal(localNumber)}`;
  }

  return `+${country.code} ${localNumber}`;
}

/**
 * Extracts raw numbers from a WhatsApp input, ensuring it starts with country code
 */
export function parseWhatsAppRaw(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validates a Brazilian WhatsApp number
 */
export function isValidBrazilianWhatsApp(value: string): boolean {
  const numbers = value.replace(/\D/g, "");
  return numbers.length === 13 && numbers.startsWith("55");
}

/**
 * Validates any WhatsApp number (min 10 digits total)
 */
export function isValidWhatsApp(value: string): boolean {
  const numbers = value.replace(/\D/g, "");
  return numbers.length >= 10;
}

const WhatsAppInput = forwardRef<HTMLInputElement, WhatsAppInputProps>(
  ({ value, onChange, className, showFormatted = true, ...props }, ref) => {
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
    const [localNumber, setLocalNumber] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const initialized = useRef(false);

    // Initialize from value on first render
    useEffect(() => {
      if (!initialized.current && value) {
        const numbers = value.replace(/\D/g, "");
        if (numbers) {
          const country = findCountryByCode(numbers);
          setSelectedCountry(country);
          setLocalNumber(numbers.slice(country.code.length));
          initialized.current = true;
        }
      } else if (!value) {
        initialized.current = false;
      }
    }, [value]);

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      const maxLocal = selectedCountry.maxDigits - selectedCountry.code.length;
      const trimmed = digits.slice(0, maxLocal);
      setLocalNumber(trimmed);
      onChange(selectedCountry.code + trimmed);
    };

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      // Reset local number when changing country since format differs
      const maxLocal = country.maxDigits - country.code.length;
      const trimmed = localNumber.slice(0, maxLocal);
      setLocalNumber(trimmed);
      onChange(country.code + trimmed);
      setPopoverOpen(false);
    };

    const displayValue = showFormatted && selectedCountry.code === "55"
      ? formatBrazilLocal(localNumber)
      : localNumber;

    const rawFull = selectedCountry.code + localNumber;

    return (
      <div className="space-y-1">
        <div className="flex gap-0">
          {/* Country selector */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-2.5 h-10 rounded-l-md border border-r-0 border-input bg-muted/50 text-sm shrink-0 hover:bg-muted transition-colors",
                  className?.includes("bg-[#141417]") && "bg-[#1a1a1e] border-[#2a2a2e] hover:bg-[#222226]"
                )}
              >
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                <span className="text-xs text-muted-foreground">+{selectedCountry.code}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-1 bg-popover border-border"
              align="start"
              sideOffset={4}
            >
              <div className="max-h-60 overflow-y-auto">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                      selectedCountry.code === country.code && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="text-base">{country.flag}</span>
                    <span className="flex-1 text-left">{country.name}</span>
                    <span className="text-xs text-muted-foreground">+{country.code}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Phone number input */}
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={displayValue}
            onChange={handleLocalChange}
            placeholder={selectedCountry.code === "55" ? "(00) 00000-0000" : "Número"}
            className={cn("rounded-l-none", className)}
            {...props}
          />
        </div>
        {rawFull.length > selectedCountry.code.length && !isValidWhatsApp(rawFull) && (
          <p className="text-xs text-destructive/80">
            Número incompleto (mínimo 10 dígitos)
          </p>
        )}
      </div>
    );
  }
);

WhatsAppInput.displayName = "WhatsAppInput";

export { WhatsAppInput };
