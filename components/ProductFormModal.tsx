"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { DEPARTMENTS } from "@/lib/departments";
import type { Product, ProductAddon, ProductVariation } from "@/types/product";

const DEPARTMENT_NAMES = [
  "Hambúrgueres",
  "Combos",
  "Porções",
  "Acompanhamentos",
  "Bebidas",
  "Sobremesas",
  ...DEPARTMENTS.map((department) => department.name),
];

const parsePrice = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  return Number(normalized);
};

interface ProductFormModalProps {
  product?: Product | null;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}

export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const isEditing = Boolean(product);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [department, setDepartment] = useState(
    product?.department ?? DEPARTMENT_NAMES[0],
  );
  const [category, setCategory] = useState(product?.category ?? "");
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [stock, setStock] = useState(product ? String(product.stock) : "100");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isNew, setIsNew] = useState(product?.is_new ?? false);

  const [price, setPrice] = useState(
    product ? String(product.price).replace(".", ",") : "",
  );
  const [originalPrice, setOriginalPrice] = useState(
    product?.original_price != null
      ? String(product.original_price).replace(".", ",")
      : "",
  );
  const [installmentPrice, setInstallmentPrice] = useState(
    product?.installment_price != null
      ? String(product.installment_price).replace(".", ",")
      : "",
  );
  const [installments, setInstallments] = useState(
    product ? String(product.installments ?? 3) : "3",
  );

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [options, setOptions] = useState<ProductVariation[]>(
    product?.options ?? [],
  );
  const [addons, setAddons] = useState<ProductAddon[]>(product?.addons ?? []);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonDescription, setAddonDescription] = useState("");
  const [addonImage, setAddonImage] = useState("");


  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleAddImage = () => {
    const value = imageUrlInput.trim();
    if (value && !images.includes(value)) {
      setImages([...images, value]);
      setImageUrlInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
      ].includes(file.type)
    ) {
      setFeedback("Envie uma imagem JPG, PNG, WebP, GIF ou AVIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback("A imagem deve ter no máximo 10 MB.");
      return;
    }

    setFeedback(null);
    setUploadingImage(true);
    try {
      const signatureResponse = await fetch(
        "/api/uploads/cloudinary-signature",
        {
          method: "POST",
        },
      );
      const signatureData = await signatureResponse.json();
      if (!signatureResponse.ok) {
        throw new Error(
          signatureData.error || "Não foi possível iniciar o envio.",
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("folder", signatureData.folder);
      formData.append("signature", signatureData.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/image/upload`,
        { method: "POST", body: formData },
      );
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.secure_url) {
        throw new Error(
          uploadData.error?.message || "O Cloudinary não aceitou a imagem.",
        );
      }

      setImages((current) => [...current, uploadData.secure_url]);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao enviar imagem.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const allImages = [...images];
      if (imageUrlInput.trim() && !allImages.includes(imageUrlInput.trim())) {
        allImages.push(imageUrlInput.trim());
      }

      const payload = {
        name,
        department,
        category: category || "Geral",
        subcategory,
        brand,
        description,
        images: allImages,
        options,
        addons,
        price: parsePrice(price),
        original_price: originalPrice ? parsePrice(originalPrice) : null,
        installment_price: installmentPrice
          ? parsePrice(installmentPrice)
          : null,
        installments: parseInt(installments, 10) || 3,
        stock: parseInt(stock, 10) || 100,
        is_featured: isFeatured,
        is_new: isNew,
        specifications: {},
      };

      const response = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar produto.");
      }

      onSaved?.(data.product);
      onClose();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao salvar produto.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar produto" : "Novo produto"}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl [&_input::placeholder]:text-gray-500 [&_textarea::placeholder]:text-gray-500 [&_input:focus]:border-brand-red [&_input:focus]:ring-2 [&_input:focus]:ring-brand-red/20 [&_select:focus]:border-brand-red [&_select:focus]:ring-2 [&_select:focus]:ring-brand-red/20 [&_textarea:focus]:border-brand-red [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-brand-red/20"
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-medium text-gray-900">
              {isEditing ? "Editar produto" : "Novo produto"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {feedback && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {feedback}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: X-Bacon especial"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 md:text-base"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-700">
                    Departamento
                  </label>
                  <input
                    type="text"
                    list="department-options"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Ex: Hambúrgueres"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                  <datalist id="department-options">
                    {DEPARTMENT_NAMES.map((departmentName) => (
                      <option key={departmentName} value={departmentName} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Digite para criar um novo departamento.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-700">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Ex: Hambúrgueres artesanais"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-700">
                    Subcategoria
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(event) => setSubcategory(event.target.value)}
                    placeholder="Ex: Com cheddar"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-700">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Ex: Max Burguer"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-700">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva os ingredientes, acompanhamentos e o que torna este produto especial."
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Imagens do Produto
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  className={`ui-action cursor-pointer rounded-lg bg-brand-red-dark px-3.5 py-2 text-white transition hover:bg-brand-red ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}
                >
                  {uploadingImage
                    ? "Enviando imagem..."
                    : "Enviar do computador"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="sr-only"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      void handleUploadImage(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <span className="text-xs text-gray-500">
                  JPG, PNG, WebP, GIF ou AVIF · até 10 MB
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                  placeholder="https://exemplo.com/imagem-do-produto.jpg"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="ui-action rounded-lg bg-gray-800 px-3.5 py-2 text-white transition hover:bg-gray-900"
                >
                  Adicionar
                </button>
              </div>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {images.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="group relative h-16 w-16 overflow-hidden rounded border border-gray-200 bg-gray-50"
                    >
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute inset-0 flex items-center justify-center bg-red-600/80 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase text-gray-700">
                Preços e Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Preço à Vista (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="Ex: 29,90"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Preço De (Original)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={originalPrice}
                    onChange={(event) => setOriginalPrice(event.target.value)}
                    placeholder="Ex: 34,90 (opcional)"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Preço a Prazo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={installmentPrice}
                    onChange={(event) =>
                      setInstallmentPrice(event.target.value)
                    }
                    placeholder="Ex: 10,00"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Quantas vezes
                  </label>
                  <select
                    value={installments}
                    onChange={(event) => setInstallments(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#279236]"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((times) => (
                      <option key={times} value={times}>
                        {times}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <h3 className="text-xs font-semibold uppercase text-gray-700">Adicionais</h3>
                <p className="mt-1 text-xs text-gray-500">Cadastre bacon, maionese e outros extras deste produto.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={addonName} onChange={(event) => setAddonName(event.target.value)} placeholder="Ex: Bacon extra" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                <input value={addonPrice} onChange={(event) => setAddonPrice(event.target.value)} inputMode="decimal" placeholder="Preço adicional (ex: 3,50)" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                <input value={addonDescription} onChange={(event) => setAddonDescription(event.target.value)} placeholder="Ex: 2 fatias de bacon crocante" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                <input value={addonImage} onChange={(event) => setAddonImage(event.target.value)} placeholder="Link da foto do adicional (opcional)" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" />
              </div>
              <button type="button" onClick={() => {
                const cleanName = addonName.trim();
                const parsedPrice = parsePrice(addonPrice || "0");
                if (!cleanName || !Number.isFinite(parsedPrice) || parsedPrice < 0) return;
                setAddons((current) => [...current, { id: crypto.randomUUID(), name: cleanName, price: parsedPrice, description: addonDescription.trim(), image: addonImage.trim() }]);
                setAddonName(""); setAddonPrice(""); setAddonDescription(""); setAddonImage("");
              }} className="ui-action rounded-lg bg-gray-800 px-3 py-2 text-sm text-white">Adicionar extra</button>
              {addons.length > 0 && <div className="space-y-2">{addons.map((addon, index) => <div key={addon.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">{addon.image && <Image src={addon.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" />}<div className="min-w-0"><p className="font-medium text-gray-900">{addon.name} · R$ {Number(addon.price).toFixed(2)}</p>{addon.description && <p className="truncate text-xs text-gray-500">{addon.description}</p>}</div></div>
                <button type="button" onClick={() => setAddons((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${addon.name}`} className="text-red-600">Remover</button>
              </div>)}</div>}
            </div>

            <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(event) => setIsFeatured(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#279236]"
                  />
                  <span>Destacar na Vitrine Principal</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(event) => setIsNew(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#279236]"
                  />
                  <span>Novidade · exibir em “Acabou de chegar”</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="ui-action rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-action rounded-lg bg-brand-red-dark px-5 py-2 text-white transition hover:bg-brand-red disabled:opacity-70"
            >
              {submitting
                ? "Salvando..."
                : isEditing
                  ? "Salvar alterações"
                  : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
