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
        className="h-10 w-14 cursor-pointer rounded-md border border-input"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="w-28 font-mono uppercase"
        placeholder="#6B7280"
      />
    </div>
  );
}
