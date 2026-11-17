"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCartPlus } from "lucide-react";
import AddToCartModal from "@/components/AddToCartModal";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types/product";
import { getPromotedUnitPrice } from "@/lib/promotions";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function HomeProductRow({ product, badge }: { product: Product; badge?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { addToCart } = useCart();
  const basePrice = Number(product.price);
  const price = Number(
    product.promotional_price ??
      (product.promotion
        ? getPromotedUnitPrice(product.promotion, basePrice)
        : basePrice),
  );
  const previousPrice = Number(product.original_price ?? product.price);
  const minQuantity = product.promotion?.min_quantity ?? 1;

  return (
    <article className="flex min-h-36 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-brand-red-dark/30 hover:shadow-md">
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center p-4 sm:p-5">
        {badge && <span className="mb-2 rounded-full bg-brand-red-dark/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-red-dark">{badge}</span>}
        <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 hover:text-brand-red-dark sm:text-base">{product.name}</Link>
        {product.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 sm:text-sm">{product.description}</p>}
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          {previousPrice > price && <span className="text-xs text-gray-400 line-through">{money.format(previousPrice)}</span>}
          <span className="text-base font-extrabold text-gray-900 sm:text-lg">{money.format(price)}</span>
        </div>
        {product.promotion && minQuantity > 1 && price < basePrice && <p className="mt-1 text-[11px] font-medium text-brand-red-dark">Por unidade a partir de {minQuantity} unidades</p>}
        <button type="button" onClick={() => setModalOpen(true)} className="ui-action mt-3 inline-flex items-center gap-2 rounded-full bg-brand-red-dark px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-red sm:text-sm">
          <ShoppingCartPlus size={16} /> Adicionar
        </button>
      </div>
      <Link href={`/produto/${product.slug}`} aria-label={`Ver ${product.name}`} className="relative m-2 ml-0 flex aspect-square w-[34%] max-w-44 shrink-0 self-center items-center justify-center overflow-hidden rounded-xl bg-amber-50 sm:m-3 sm:ml-0 sm:w-[32%]">
        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 sm:p-3" /> : <span aria-hidden="true" className="text-4xl">🍔</span>}
      </Link>
      {modalOpen && <AddToCartModal product={product} onClose={() => setModalOpen(false)} onConfirm={(addonIds, observation) => { addToCart(product, 1, addonIds, observation); setModalOpen(false); }} />}
    </article>
  );
}

export default function HomeProductRows({
  title,
  subtitle,
  products,
  badge,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  badge?: string;
}) {
  if (!products.length) return null;

  return (
    <section className="py-7 sm:py-9">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-4">
          <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/75">{subtitle}</p>}
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {products.slice(0, 8).map((product) => <HomeProductRow key={product.id} product={product} badge={badge} />)}
        </div>
      </div>
    </section>
  );
}
