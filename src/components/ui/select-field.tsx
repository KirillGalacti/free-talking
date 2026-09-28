import type { CSSProperties } from "react";
import { ChevronIcon } from "@/components/icons";

interface SelectFieldProps<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  style: CSSProperties;
  label: string;
}

/** Light pill select with the chevron from the mockup. */
export function SelectField<T extends string | number>({ value, options, onChange, style, label }: SelectFieldProps<T>) {
  return (
    <label className="select-field" style={style}>
      <select
        aria-label={label}
        value={String(value)}
        onChange={(event) => {
          const next = options.find((option) => String(option.value) === event.target.value);
          if (next) onChange(next.value);
        }}
      >
        {options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
      </select>
      <ChevronIcon color="#544C4C" width={16} className="select-chevron" />
    </label>
  );
}
