"use client";

import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Seleccionar color"
        className="h-11 w-16 cursor-pointer rounded-xl border border-input bg-transparent p-1 md:h-10"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="w-28 font-mono uppercase"
        placeholder="#6B7280"
        aria-label="Color en formato hexadecimal"
      />
    </div>
  );
}
