"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gift,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

const coupons = [
  {
    code: "PRIMEIRACOMPRA20",
    discount: "20%",
    color: "from-brand-red-dark to-brand-red",
  },
  {
    code: "PRIMEIRACOMPRA30",
    discount: "30%",
    color: "from-brand-red-dark to-brand-red",
  },
  {
    code: "PRIMEIRACOMPRA40",
    discount: "40%",
    color: "from-brand-red-dark to-brand-red",
  },
];

export default function PrimeiraCompraPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;

    fetch("/api/products?limit=8")
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return (data.products ?? []) as Product[];
      })
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((error) => console.error("Erro ao carregar produtos:", error));

    return () => {
      active = false;
    };
  }, []);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Não foi possível copiar o cupom:", error);
    }
  }

  return (
    <main className="flex-1 overflow-hidden bg-[#1C3715]">
      <section
        id="cupons"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red-dark">
            Um presente de boas-vindas
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Escolha seu desconto
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Copie o código desejado e aplique no campo de cupom ao finalizar seu
            pedido.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {coupons.map(({ code, discount, color }) => {
            const isCopied = copiedCode === code;
            return (
              <article
                key={code}
                className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-red-dark/10"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${color}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-md`}
                  >
                    <Tag className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-brand-red-dark">
                    PRIMEIRO PEDIDO
                  </span>
                </div>
                <p className="mt-6 text-5xl font-black tracking-tight text-gray-900">
                  {discount}
                  <span className="ml-1 text-xl font-bold text-brand-red-dark">
                    OFF
                  </span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Use este código no seu pedido
                </p>
                <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50/70 p-3">
                  <span className="break-all font-mono text-sm font-extrabold tracking-wide text-[#44240b]">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyCode(code)}
                    aria-label={`${isCopied ? "Cupom copiado" : "Copiar cupom"} ${code}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-brand-red-dark shadow-sm ring-1 ring-amber-100 transition hover:bg-amber-50"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {isCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {products.length > 0 && (
          <section className="mt-14" aria-labelledby="products-heading">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red-dark">
                  Para abrir o apetite
                </p>
                <h2
                  id="products-heading"
                  className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl"
                >
                  Escolha seu primeiro pedido
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  Monte seu pedido e aproveite as condições especiais.
                </p>
              </div>
              <Link
                href="/ofertas"
                className="flex items-center text-sm font-bold text-brand-red-dark transition hover:text-brand-red hover:underline"
              >
                <span>Ver todas as ofertas</span>
                <ChevronRight size={20} />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-9 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-red-dark px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-red"
          >
            <ShoppingBag className="h-4 w-4" /> Escolher produtos
          </Link>
          <p className="mt-3 text-xs text-white/65">
            Os cupons estão sujeitos às regras e à disponibilidade indicadas na
            finalização do pedido.
          </p>
        </div>
      </section>
    </main>
  );
}
