import type { Metadata } from "next";
import { listCategories } from "@/core/services/category.service";
import { CategoriesClient } from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Categorías",
  description: "Organiza tus ingresos y gastos por categoría.",
};

export default async function CategoriesPage() {
  const { income, expense, deleted } = await listCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CategoriesClient
        income={income}
        expense={expense}
        deleted={deleted}
      />
    </div>
  );
}
