"use client";

import { useEffect, useState } from "react";
import ProductCarousel from "@/components/ProductCarousel";
import HomeProductRows from "@/components/HomeProductRows";
import type { Product } from "@/types/product";
import { getPromotedUnitPrice } from "@/lib/promotions";

function discountPercentage(product: Product): number {
  const price = Number(product.price);
  if (product.promotion) {
    const promoted = getPromotedUnitPrice(product.promotion, price);
    if (promoted < price && price > 0) return 1 - promoted / price;
  }
  const promotionalPrice =
    product.promotional_price == null
      ? null
      : Number(product.promotional_price);

  if (promotionalPrice !== null && promotionalPrice < price && price > 0) {
    return 1 - promotionalPrice / price;
  }

  const originalPrice =
    product.original_price == null ? null : Number(product.original_price);

  if (originalPrice === null || originalPrice <= price) {
    return 0;
  }

  return 1 - price / originalPrice;
}

export default function HomeContent({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (active && response.ok) {
          setProducts(data.products ?? []);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const featured = products.filter((product) => product.is_featured);
  const discounted = [...products]
    .filter(
      (product) =>
        discountPercentage(product) > 0 || Boolean(product.promotion),
    )
    .sort((a, b) => discountPercentage(b) - discountPercentage(a));
  const newArrivals = products.filter((product) => product.is_new);
  const departmentGroups = Array.from(
    products.reduce((groups, product) => {
      const department = product.department?.trim() || product.category?.trim();
      if (department)
        groups.set(department, [...(groups.get(department) ?? []), product]);
      return groups;
    }, new Map<string, Product[]>()),
  ).sort(([first], [second]) => {
    const order = [
      "Hambúrgueres",
      "Combos",
      "Porções",
      "Acompanhamentos",
      "Bebidas",
      "Sobremesas",
    ];
    const firstIndex = order.indexOf(first);
    const secondIndex = order.indexOf(second);
    if (firstIndex >= 0 || secondIndex >= 0) {
      return (
        (firstIndex < 0 ? order.length : firstIndex) -
        (secondIndex < 0 ? order.length : secondIndex)
      );
    }
    return first.localeCompare(second, "pt-BR");
  });

  return (
    <main className="flex-1">
      {loading ? (
        <section aria-label="Carregando produtos" className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-5 h-7 w-48 animate-pulse rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          </div>
        </section>
      ) : products.length > 0 ? (
        <>
          <ProductCarousel
            products={featured}
            title="Destaques"
            subtitle="Os favoritos da casa, selecionados para você."
          />
          <HomeProductRows
            title="Black Friday e Promoções"
            subtitle="Aproveite os produtos com preço especial."
            products={discounted}
            badge="Oferta"
          />
          <HomeProductRows
            title="Lançamentos"
            subtitle="Experimente as novidades do cardápio."
            products={newArrivals}
            badge="Novidade"
          />
          {departmentGroups.map(([department, departmentProducts]) => (
            <HomeProductRows
              key={department}
              title={department}
              products={departmentProducts}
            />
          ))}
        </>
      ) : (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500">
              Nenhum produto disponível no momento.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
