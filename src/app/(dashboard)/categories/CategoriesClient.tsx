"use client";

import { useState } from "react";
import { Plus, Tags, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn, AnimatedListItem } from "@/components/ui/motion";
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
          c.deleted_at === null,
      )
    : [];

  return (
    <div className="space-y-8">
      <FadeIn direction="up" delay={1}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categorías</h1>
            <p className="text-sm text-muted-foreground">
              Clasifica tus ingresos y gastos para entender mejor tu dinero.
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva categoría
          </Button>
        </div>
      </FadeIn>

      <section className="space-y-4">
        <FadeIn direction="up" delay={2}>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-income/12">
              <Tag className="size-4 text-income" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-income">Ingresos</h2>
          </div>
        </FadeIn>
        {income.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Sin categorías de ingreso"
            description="Crea una categoría para empezar a clasificar tus ingresos."
            className="py-10"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {income.map((cat, index) => (
              <AnimatedListItem key={cat.id} index={index}>
                <CategoryCard
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </AnimatedListItem>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <FadeIn direction="up" delay={3}>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-expense/12">
              <Tag className="size-4 text-expense" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-expense">Gastos</h2>
          </div>
        </FadeIn>
        {expense.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Sin categorías de gasto"
            description="Crea una categoría para empezar a clasificar tus gastos."
            className="py-10"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expense.map((cat, index) => (
              <AnimatedListItem key={cat.id} index={index}>
                <CategoryCard
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </AnimatedListItem>
            ))}
          </div>
        )}
      </section>

      {deleted.length > 0 && (
        <section className="space-y-4 opacity-60">
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
