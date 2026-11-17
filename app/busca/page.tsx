import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogView from "@/components/CatalogView";
import CatalogSkeleton from "@/components/CatalogSkeleton";
import { getAllProducts } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Busca | Supermercado Bertoletti",
  description: "Encontre produtos no Supermercado Bertoletti.",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const products = await getAllProducts();

  return <CatalogView initialProducts={products} searchQuery={q.trim()} />;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
