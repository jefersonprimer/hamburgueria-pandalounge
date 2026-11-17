"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import type { Product } from "@/types/product";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AddToCartModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (addonIds: string[], observation: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState("");
  const addons = product.addons ?? [];

  useEffect(() => {
    setMounted(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  const extrasTotal = addons
    .reduce((sum, addon) => sum + Number(addon.price) * (selected[addon.id] ?? 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-to-cart-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="add-to-cart-title" className="text-lg font-bold text-gray-900">Personalize seu pedido</h2>
            <p className="mt-0.5 text-sm text-gray-600">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {addons.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-900">Quer adicionar algo?</legend>
              <div className="space-y-2">
                {addons.map((addon) => {
                  const quantity = selected[addon.id] ?? 0;
                  return (
                    <div key={addon.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${quantity > 0 ? "border-brand-red bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                      {addon.image ? <img src={addon.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : null}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900">{addon.name}</span>
                        {addon.description && <span className="mt-0.5 block text-xs text-gray-600">{addon.description}</span>}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">{money.format(Number(addon.price))}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={quantity === 0} onClick={() => setSelected((current) => ({ ...current, [addon.id]: Math.max((current[addon.id] ?? 0) - 1, 0) }))} aria-label={`Remover uma porção de ${addon.name}`} className="rounded-full border border-gray-300 p-1 text-gray-700 disabled:opacity-40"><Minus size={16} /></button>
                        <span aria-live="polite" className="min-w-4 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                        <button type="button" disabled={quantity >= 20} onClick={() => setSelected((current) => ({ ...current, [addon.id]: (current[addon.id] ?? 0) + 1 }))} aria-label={`Adicionar uma porção de ${addon.name}`} className="rounded-full border border-gray-300 p-1 text-gray-700 disabled:opacity-40"><Plus size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Este produto não tem adicionais cadastrados.</p>
          )}

          <div>
            <label htmlFor="order-observation" className="mb-2 block text-sm font-semibold text-gray-900">Observação <span className="font-normal text-gray-500">(opcional)</span></label>
            <textarea id="order-observation" value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={300} rows={3} placeholder="Ex.: sem cebola, maionese à parte..." className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20" />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-gray-100 px-5 py-4">
          <span className="text-sm text-gray-600">Extras: <strong className="text-gray-900">{money.format(extrasTotal)}</strong></span>
          <button type="button" onClick={() => onConfirm(Object.entries(selected).flatMap(([id, quantity]) => Array.from({ length: quantity }, () => id)), observation.trim())} className="ui-action rounded-full bg-brand-red-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-red">Adicionar ao carrinho</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
