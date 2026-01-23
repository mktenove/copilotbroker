import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WhatsAppInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  /** If true, shows the formatted display. If false, shows raw numbers */
  showFormatted?: boolean;
}

/**
 * Formats a WhatsApp number for display: +55 (XX) XXXXX-XXXX
 * Stores as raw numbers: 55XXXXXXXXXXX (13 digits)
 */
export function formatWhatsAppDisplay(value: string): string {
  const numbers = value.replace(/\D/g, "");
  
  // Always start with 55 (Brazil code)
  let formatted = numbers;
  
  // If doesn't start with 55, prepend it
  if (!formatted.startsWith("55") && formatted.length > 0) {
    formatted = "55" + formatted;
  }
  
  // Limit to 13 digits (55 + 11 digits)
  formatted = formatted.slice(0, 13);
  
  // Format for display: +55 (XX) XXXXX-XXXX
  if (formatted.length <= 2) {
    return formatted.length > 0 ? `+${formatted}` : "";
  }
  if (formatted.length <= 4) {
    return `+${formatted.slice(0, 2)} (${formatted.slice(2)}`;
  }
  if (formatted.length <= 9) {
    return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`;
  }
  return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4, 9)}-${formatted.slice(9, 13)}`;
}

/**
 * Extracts raw numbers from a WhatsApp input, ensuring it starts with 55
 */
export function parseWhatsAppRaw(value: string): string {
  let numbers = value.replace(/\D/g, "");
  
  // Ensure it starts with 55
  if (!numbers.startsWith("55") && numbers.length > 0) {
    numbers = "55" + numbers;
  }
  
  // Limit to 13 digits
  return numbers.slice(0, 13);
}

/**
 * Validates a Brazilian WhatsApp number
 * Must be exactly 13 digits: 55 + 2 digit area code + 9 digit number
 */
export function isValidBrazilianWhatsApp(value: string): boolean {
  const numbers = value.replace(/\D/g, "");
  return numbers.length === 13 && numbers.startsWith("55");
}

const WhatsAppInput = forwardRef<HTMLInputElement, WhatsAppInputProps>(
  ({ value, onChange, className, showFormatted = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      if (showFormatted) {
        setDisplayValue(formatWhatsAppDisplay(value));
      } else {
        setDisplayValue(value);
      }
    }, [value, showFormatted]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const rawValue = parseWhatsAppRaw(inputValue);
      onChange(rawValue);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="+55 (00) 00000-0000"
          maxLength={19} // +55 (00) 00000-0000
          className={cn(className)}
          {...props}
        />
        {value && !isValidBrazilianWhatsApp(value) && (
          <p className="text-xs text-destructive/80 mt-1">
            Número incompleto. Formato: +55 (DDD) 9XXXX-XXXX
          </p>
        )}
      </div>
    );
  }
);

WhatsAppInput.displayName = "WhatsAppInput";

export { WhatsAppInput };
