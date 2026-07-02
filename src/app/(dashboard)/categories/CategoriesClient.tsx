"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import type { CategoryWithMeta } from "@/core/models/category";

interface CategoriesClientProps {
  income: CategoryWithMeta[];
  expense: CategoryWithMeta[];
  deleted: CategoryWithMeta[];
}

export function CategoriesClient({
  income,
  expense,
  deleted,
}: CategoriesClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithMeta | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryWithMeta | null>(null);

  function handleNew() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function handleEdit(category: CategoryWithMeta) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function handleDelete(category: CategoryWithMeta) {
    setDeletingCategory(category);
  }

  const availableTargets = deletingCategory
    ? [...income, ...expense].filter(
        (c) =>
          c.id !== deletingCategory.id &&
          c.type === deletingCategory.type &&
          c.deleted_at === null
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-emerald-600">Ingresos</h2>
        {income.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay categorías de ingreso. Crea una para empezar a clasificar tus
            ingresos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {income.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rose-600">Gastos</h2>
        {expense.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay categorías de gasto. Crea una para empezar a clasificar tus
            gastos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expense.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {deleted.length > 0 && (
        <section className="space-y-3 opacity-60">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Categorías eliminadas (en historial)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deleted.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editingCategory}
      />

      <DeleteCategoryDialog
        category={deletingCategory}
        availableTargets={availableTargets}
        onClose={() => setDeletingCategory(null)}
      />
    </div>
  );
}
