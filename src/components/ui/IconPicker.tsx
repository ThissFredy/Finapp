"use client";

import { useState } from "react";
import {
  Tag,
  Wallet,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Film,
  Plane,
  Heart,
  Gift,
  GraduationCap,
  Dumbbell,
  Coffee,
  Smartphone,
  Zap,
  Droplet,
  Wifi,
  Stethoscope,
  PiggyBank,
  CreditCard,
  Receipt,
  TrendingUp,
  Briefcase,
  Landmark,
  Coins,
  DollarSign,
  Plus,
  Minus,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const POPULAR_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  wallet: Wallet,
  utensils: Utensils,
  car: Car,
  home: Home,
  "shopping-bag": ShoppingBag,
  film: Film,
  plane: Plane,
  heart: Heart,
  gift: Gift,
  graduation: GraduationCap,
  dumbbell: Dumbbell,
  coffee: Coffee,
  smartphone: Smartphone,
  zap: Zap,
  droplet: Droplet,
  wifi: Wifi,
  stethoscope: Stethoscope,
  piggybank: PiggyBank,
  "credit-card": CreditCard,
  receipt: Receipt,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  landmark: Landmark,
  coins: Coins,
  dollar: DollarSign,
  plus: Plus,
  minus: Minus,
  transfer: ArrowLeftRight,
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [customIcon, setCustomIcon] = useState("");

  const filteredIcons = Object.entries(POPULAR_ICONS).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = POPULAR_ICONS[value] ?? Tag;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-muted">
          <SelectedIcon className="h-5 w-5" />
        </div>
        <Input
          value={value}
          readOnly
          className="flex-1 font-mono"
          placeholder="Selecciona un ícono"
        />
      </div>

      <Input
        type="search"
        placeholder="Buscar ícono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-6 gap-2 rounded-md border border-input p-3 max-h-48 overflow-y-auto">
        {filteredIcons.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
              value === name
                ? "border-primary bg-primary/10"
                : "border-input hover:bg-muted"
            }`}
            title={name}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Ícono personalizado (nombre lucide)"
          value={customIcon}
          onChange={(e) => setCustomIcon(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (customIcon.trim()) {
              onChange(customIcon.trim().toLowerCase());
              setCustomIcon("");
            }
          }}
        >
          Usar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        ¿No encuentras el ícono? Consulta el catálogo completo en{" "}
        <a
          href="https://lucide.dev/icons"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          lucide.dev/icons
        </a>{" "}
        y copia el nombre aquí.
      </p>
    </div>
  );
}
