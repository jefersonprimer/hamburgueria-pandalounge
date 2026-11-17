"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { useFreeShippingPromotion } from "@/hooks/useFreeShippingPromotion";
import { useStoreSchedule } from "@/hooks/useStoreSchedule";
import { describeStoreHours, getScheduleError } from "@/lib/store-hours";
import { calculateLineDiscount, getPromotedUnitPrice } from "@/lib/promotions";
import { getCartItemAddonGroups, getCartItemKey, getCartItemUnitPrice } from "@/lib/cart";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function CartPage() {
  const deliveryFee = useDeliveryFee();
  const freeShippingPromotions = useFreeShippingPromotion();
  const storeSchedule = useStoreSchedule();
  const {
    items,
    itemCount,
    total,
    promotionsDiscount,
    subtotalAfterPromotions,
    couponsAllowed,
    coupon,
    couponEligible,
    discount,
    finalTotal,
    setCartQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const qualifyingFreeShippingPromotion = freeShippingPromotions
    .filter((promotion) => total >= promotion.min_purchase)
    .sort((a, b) => a.min_purchase - b.min_purchase)[0];
  const nextFreeShippingPromotion = freeShippingPromotions
    .filter((promotion) => total < promotion.min_purchase)
    .sort((a, b) => a.min_purchase - b.min_purchase)[0];
  const freeShipping =
    coupon?.free_shipping === true || Boolean(qualifyingFreeShippingPromotion);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleBounds, setScheduleBounds] = useState({ min: "", max: "" });
  const [delivery, setDelivery] = useState({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    scheduledFor: "",
  });

  useEffect(() => {
    if (!checkoutOpen) return;
    const formatLocalDateTime = (date: Date) => {
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    const now = new Date();
    setScheduleBounds({
      min: formatLocalDateTime(new Date(now.getTime() + 30 * 60 * 1000)),
      max: formatLocalDateTime(
        new Date(now.getTime() + storeSchedule.maxAdvanceDays * 86_400_000),
      ),
    });
  }, [checkoutOpen, storeSchedule.maxAdvanceDays]);

  useEffect(() => {
    if (!delivery.scheduledFor) {
      setScheduleError(null);
      return;
    }
    setScheduleError(getScheduleError(delivery.scheduledFor, storeSchedule));
  }, [delivery.scheduledFor, storeSchedule]);

  useEffect(() => {
    if (!checkoutOpen) return;
    let savedCep = "";
    try {
      savedCep = localStorage.getItem("fanfar_cep") || "";
    } catch {
      return;
    }
    if (savedCep.replace(/\D/g, "").length !== 8) return;

    setDelivery((previous) => ({ ...previous, cep: savedCep }));
    void (async () => {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${savedCep.replace(/\D/g, "")}/json/`,
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.erro) return;
        setDelivery((previous) => ({
          ...previous,
          cep: data.cep || savedCep,
          street: previous.street || data.logradouro || "",
          neighborhood: previous.neighborhood || data.bairro || "",
          city: previous.city || data.localidade || "",
          state: previous.state || data.uf || "",
        }));
      } catch {
        // O usuário ainda pode preencher o endereço manualmente.
      }
    })();
  }, [checkoutOpen]);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedScheduleError = getScheduleError(
      delivery.scheduledFor,
      storeSchedule,
    );
    if (selectedScheduleError) {
      setScheduleError(selectedScheduleError);
      return;
    }
    setScheduleError(null);
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            addonIds: item.addonIds,
            observation: item.observation,
          })),
          address: {
            cep: delivery.cep,
            street: delivery.street,
            number: delivery.number,
            complement: delivery.complement,
            neighborhood: delivery.neighborhood,
            city: delivery.city,
            state: delivery.state,
          },
          scheduledFor: new Date(delivery.scheduledFor).toISOString(),
          freeShippingCouponCode: coupon?.free_shipping ? coupon.code : null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível finalizar o pedido.");
      clearCart();
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const lookupCep = async () => {
    const cep = delivery.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepMessage("Digite um CEP com 8 números.");
      return;
    }
    setCepLoading(true);
    setCepMessage("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok)
        throw new Error("Não foi possível consultar o CEP agora.");
      const data = await response.json();
      if (data.erro) throw new Error("CEP não encontrado. Confira os números.");
      setDelivery((previous) => ({
        ...previous,
        cep: data.cep || previous.cep,
        street: data.logradouro || previous.street,
        neighborhood: data.bairro || previous.neighborhood,
        city: data.localidade || previous.city,
        state: data.uf || previous.state,
      }));
      setCepMessage(
        "Endereço preenchido. Confira os dados e informe o número.",
      );
    } catch (error) {
      setCepMessage(
        error instanceof Error ? error.message : "Falha ao buscar o CEP.",
      );
    } finally {
      setCepLoading(false);
    }
  };

  const handleApplyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = couponCode.trim();

    if (!code) {
      setCouponError("Informe o código do cupom.");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: subtotalAfterPromotions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível aplicar o cupom.");
      }

      applyCoupon(data.coupon);
      setCouponCode("");
    } catch (error) {
      setCouponError(
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar o cupom.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponError(null);
    setCouponCode("");
  };

  return (
    <main className="flex-1 bg-[#1C3715]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Meu carrinho
        </h1>

        {items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center">
            <ShoppingCart
              className="h-12 w-12 text-gray-300"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Seu carrinho está vazio
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Adicione produtos para continuar.
            </p>
            <Link
              href="/"
              className="ui-action mt-6 rounded-full border border-brand-red-dark px-4 py-3 text-brand-red-dark transition hover:bg-brand-red-dark hover:text-white"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((item) => {
                const { product, quantity } = item;
                const image = product.images?.[0];
                const basePrice = Number(product.price);
                const selectedAddonGroups = getCartItemAddonGroups(item);
                const addonTotal = selectedAddonGroups.reduce((sum, group) => sum + Number(group.addon.price) * group.quantity, 0);
                const unitPrice = getCartItemUnitPrice(item);
                const packageAmount = Number(
                  product.specifications?.quantidade_conteudo,
                );
                const packageUnit = product.specifications?.unidade_conteudo;
                const packageUnitLabel =
                  packageUnit === "unidade"
                    ? packageAmount === 1
                      ? "unidade"
                      : "unidades"
                    : packageUnit === "g"
                      ? "g"
                      : packageUnit === "kg"
                        ? "kg"
                        : packageUnit === "ml"
                          ? "ml"
                          : packageUnit === "l"
                            ? "L"
                            : "unidade";
                const packageLabel =
                  Number.isFinite(packageAmount) && packageAmount > 0
                    ? `${new Intl.NumberFormat("pt-BR", {
                        maximumFractionDigits: 3,
                      }).format(packageAmount)} ${packageUnitLabel}`
                    : "unidade";
                const promotion = product.promotion ?? null;
                const lineDiscount = calculateLineDiscount(
                  promotion,
                  basePrice,
                  quantity,
                );
                const hasLinePromotion = lineDiscount > 0;
                const promotedUnitPrice =
                  promotion && quantity >= promotion.min_quantity
                    ? getPromotedUnitPrice(promotion, basePrice) + addonTotal
                    : unitPrice;
                const lineTotal = unitPrice * quantity - lineDiscount;

                return (
                  <article
                    key={getCartItemKey(item)}
                    className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"
                  >
                    <Link
                      href={`/produto/${product.slug}`}
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-24 sm:w-24"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Package
                          className="h-7 w-7 text-gray-300"
                          aria-hidden="true"
                        />
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <Link
                          href={`/produto/${product.slug}`}
                          className="line-clamp-2 text-sm font-medium leading-snug text-gray-800 transition-colors hover:text-brand-red-dark hover:underline md:text-base"
                        >
                          {product.name}
                        </Link>

                        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                          {hasLinePromotion && (
                            <span className="text-xs text-gray-400 line-through">
                              {currencyFormatter.format(unitPrice)}
                            </span>
                          )}
                          <span
                            className={`text-lg font-semibold md:text-xl ${
                              hasLinePromotion
                                ? "text-brand-red-dark"
                                : "text-gray-900"
                            }`}
                          >
                            {currencyFormatter.format(
                              hasLinePromotion ? promotedUnitPrice : unitPrice,
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            / {packageLabel}
                          </span>
                          {promotion?.badge_label && (
                            <span className="rounded-full bg-brand-red-dark/10 px-1.5 py-0.5 text-xs font-bold uppercase text-brand-red-dark">
                              {promotion.badge_label}
                            </span>
                          )}
                        </p>
                        {selectedAddonGroups.length > 0 && <p className="mt-1 text-xs text-gray-600">Adicionais: {selectedAddonGroups.map(({ addon, quantity: addonQuantity }) => `${addon.name}${addonQuantity > 1 ? ` (${addonQuantity}x)` : ""}`).join(", ")}</p>}
                        {item.observation && <p className="mt-1 text-xs text-gray-600">Observação: {item.observation}</p>}
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                        <div className="flex items-center rounded-full border border-brand-red-dark/25 bg-white p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCartQuantity(product, quantity - 1, item.addonIds, item.observation)
                            }
                            aria-label="Diminuir quantidade"
                            className="flex items-center justify-center rounded-full p-1 text-brand-red-dark transition hover:bg-gray-100"
                          >
                            <Minus size={24} />
                          </button>
                          <span className="min-w-5 flex-1 border-l border-r border-gray-200 px-2 text-center text-base font-semibold text-gray-800">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCartQuantity(product, quantity + 1, item.addonIds, item.observation)
                            }
                            disabled={quantity >= product.stock}
                            aria-label="Aumentar quantidade"
                            className="flex items-center justify-center rounded-full p-1 text-brand-red-dark transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            <Plus size={24} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {hasLinePromotion && (
                              <span className="block text-xs text-gray-400 line-through">
                                {currencyFormatter.format(unitPrice * quantity)}
                              </span>
                            )}
                            <span className="block text-xs text-gray-500">
                              Total
                            </span>
                            <span className="block text-lg font-bold text-gray-900">
                              {currencyFormatter.format(lineTotal)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(product.id, item.addonIds, item.observation)}
                            aria-label={`Remover ${product.name}`}
                            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCart}
                  className="ui-action text-gray-500 transition-colors hover:text-brand-red-dark"
                >
                  Limpar carrinho
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                Resumo do pedido
              </h2>

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                {!couponsAllowed && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                    As promoções deste carrinho não acumulam com cupom de
                    desconto.
                  </p>
                )}
                {coupon ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <Tag
                          className="h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-emerald-800">
                            {coupon.code}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {couponEligible
                              ? "Cupom aplicado"
                              : `Valor mínimo de ${currencyFormatter.format(
                                  coupon.min_purchase,
                                )}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        aria-label="Remover cupom"
                        className="rounded p-1 text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : couponsAllowed ? (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <label
                      htmlFor="coupon-code"
                      className="block text-xs font-normal uppercase text-gray-700"
                    >
                      Cupom de desconto
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="coupon-code"
                        type="text"
                        value={couponCode}
                        onChange={(event) =>
                          setCouponCode(event.target.value.toUpperCase())
                        }
                        placeholder="Digite o cupom"
                        autoComplete="off"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm uppercase text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading}
                        className="ui-action inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-white transition hover:bg-gray-900 disabled:opacity-70"
                      >
                        {couponLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Aplicar
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs font-medium text-red-600">
                        {couponError}
                      </p>
                    )}
                  </form>
                ) : null}
              </div>

              <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex items-center justify-between text-gray-500">
                  <dt>Itens</dt>
                  <dd>{itemCount}</dd>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <dt>Subtotal</dt>
                  <dd>{currencyFormatter.format(total)}</dd>
                </div>
                {promotionsDiscount > 0 && (
                <div className="flex items-center justify-between font-semibold text-brand-red-dark">
                    <dt>Promoções</dt>
                    <dd>-{currencyFormatter.format(promotionsDiscount)}</dd>
                  </div>
                )}
                {coupon && discount > 0 && (
                  <div className="flex items-center justify-between font-semibold text-brand-red-dark">
                    <dt>Desconto ({coupon.code})</dt>
                    <dd>-{currencyFormatter.format(discount)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-500">
                  <dt>Frete</dt>
                  <dd>
                    {freeShipping
                      ? "Grátis"
                      : currencyFormatter.format(deliveryFee)}
                  </dd>
                </div>
                {!freeShipping && nextFreeShippingPromotion && (
                  <p className="text-right text-xs text-gray-500">
                    Faltam{" "}
                    {currencyFormatter.format(
                      nextFreeShippingPromotion.min_purchase - total,
                    )}{" "}
                    para ganhar frete grátis.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900">
                  <dt>Total</dt>
                  <dd>
                    {currencyFormatter.format(
                      finalTotal + (freeShipping ? 0 : deliveryFee),
                    )}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => {
                  setCheckoutError(null);
                  setCheckoutOpen(true);
                }}
                className="ui-action mt-5 flex w-full cursor-pointer items-center justify-center rounded-full bg-brand-red-dark px-4 py-3 text-white transition hover:bg-brand-red"
              >
                Agendar e finalizar pedido
              </button>
              <Link
                href="/"
                className="ui-action mt-3 flex w-full items-center justify-center rounded-full border border-gray-200 px-4 py-2.5 text-gray-600 transition hover:bg-gray-50"
              >
                Continuar comprando
              </Link>
            </aside>
          </div>
        )}
      </div>
      {checkoutOpen && items.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-stretch justify-center bg-gray-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:overflow-y-auto sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCheckoutOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:my-auto sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-2xl"
          >
            <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <h2
                id="checkout-title"
                className="text-xl font-medium text-gray-900"
              >
                Endereço e entrega
              </h2>

              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Fechar janela"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </header>
            <form
              onSubmit={handleCheckout}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:max-h-[calc(90vh-8rem)] sm:flex-none sm:px-6"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-xs font-semibold text-gray-700">
                  <label htmlFor="delivery-cep">CEP</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="delivery-cep"
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      value={delivery.cep}
                      onChange={(e) => {
                        setDelivery({ ...delivery, cep: e.target.value });
                        setCepMessage("");
                      }}
                      onBlur={() => {
                        if (
                          delivery.cep.replace(/\D/g, "").length === 8 &&
                          !delivery.street
                        )
                          void lookupCep();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 transition focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 md:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => void lookupCep()}
                      disabled={cepLoading}
                      className="ui-action shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      {cepLoading ? "Buscando..." : "Buscar CEP"}
                    </button>
                  </div>
                  {cepMessage && (
                    <p
                      role="status"
                      className={`mt-1 text-xs font-normal ${cepMessage.startsWith("Endereço") ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      {cepMessage}
                    </p>
                  )}
                </div>
                <label className="text-xs font-semibold text-gray-700">
                  Rua ou avenida
                  <input
                    required
                    aria-label="Rua ou avenida"
                    placeholder="Nome da rua"
                    value={delivery.street}
                    onChange={(e) =>
                      setDelivery({ ...delivery, street: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Número
                  <input
                    required
                    aria-label="Número"
                    placeholder="Número"
                    value={delivery.number}
                    onChange={(e) =>
                      setDelivery({ ...delivery, number: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Complemento
                  <input
                    aria-label="Complemento"
                    placeholder="Apartamento, bloco..."
                    value={delivery.complement}
                    onChange={(e) =>
                      setDelivery({ ...delivery, complement: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Bairro
                  <input
                    required
                    aria-label="Bairro"
                    placeholder="Bairro"
                    value={delivery.neighborhood}
                    onChange={(e) =>
                      setDelivery({ ...delivery, neighborhood: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Cidade
                  <input
                    required
                    aria-label="Cidade"
                    placeholder="Cidade"
                    value={delivery.city}
                    onChange={(e) =>
                      setDelivery({ ...delivery, city: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
                  Estado
                  <input
                    required
                    aria-label="Estado"
                    placeholder="UF"
                    maxLength={2}
                    value={delivery.state}
                    onChange={(e) =>
                      setDelivery({
                        ...delivery,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal sm:max-w-32"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
                  Data e horário desejados
                  <input
                    required
                    type="datetime-local"
                    min={scheduleBounds.min}
                    max={scheduleBounds.max}
                    value={delivery.scheduledFor}
                    onChange={(e) =>
                      setDelivery({ ...delivery, scheduledFor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    Funcionamento (horário de Brasília):{" "}
                    {describeStoreHours(storeSchedule)} Agende com até{" "}
                    {storeSchedule.maxAdvanceDays} dias de antecedência.
                  </span>
                  {scheduleError && (
                    <span
                      role="alert"
                      className="mt-1 block text-xs font-semibold text-red-600"
                    >
                      {scheduleError}
                    </span>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                O pedido será enviado à farmácia para aprovação.
              </p>
              {checkoutError && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {checkoutError}
                  {checkoutError.includes("Faça login") && (
                    <>
                      {" "}
                      <Link className="underline" href="/login?next=/carrinho">
                        Entrar
                      </Link>
                    </>
                  )}
                </p>
              )}
              <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="ui-action cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                >
                  Voltar ao carrinho
                </button>
                <button
                  disabled={checkoutLoading || Boolean(scheduleError)}
                  className="ui-action cursor-pointer rounded-lg bg-brand-red-dark px-4 py-2 text-white transition hover:bg-brand-red disabled:opacity-60"
                >
                  {checkoutLoading
                    ? "Preparando pagamento..."
                    : "Ir para o pagamento"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
