import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

const storeInfo = {
  name: "Panda Lounge",
  street: "R. Mirapalhete, 1339 - Centro",
  city: "Santa Vitória do Palmar",
  state: "RS",
  postalCode: "96230-000",
  mapsUrl:
    "https://www.google.com/maps/place/Panda+Lounge+-+RESTAURANTE%2FBAR+(hamb%C3%BArguers+e+drinks)/@-33.5201585,-53.3712928,17z/data=!3m1!4b1!4m6!3m5!1s0x950d1d79c4273f73:0x86888816737f8270!8m2!3d-33.520163!4d-53.3687179!16s%2Fg%2F11w3tzkjnk",
};

const navLinks: { label: string; href: string; highlight?: boolean }[] = [
  { label: "Início", href: "/" },
  { label: "Localização no Google Maps", href: storeInfo.mapsUrl },
];

const paymentMethods = [
  { name: "Visa", src: "/payments/visa.svg" },
  { name: "MasterCard", src: "/payments/mastercard.svg" },
  { name: "Amex", src: "/payments/amex.svg" },
  { name: "Diners", src: "/payments/diners.svg" },
  { name: "Elo", src: "/payments/elo.svg" },
  { name: "JCB", src: "/payments/jcb.svg" },
  { name: "Nupay", src: "/payments/nupay.svg" },
  { name: "Pix", src: "/payments/pix.svg" },
];

interface FooterProps {
  theme?: "light" | "dark";
}

const darkClassReplacements: Record<string, string> = {
  "bg-white": "bg-black",
  "bg-gray-100": "bg-white/8",
  "bg-gray-200": "bg-white/15",
  "bg-neutral-100": "bg-black/40",
  "border-gray-200": "border-white/10",
  "border-gray-100": "border-white/10",
  "border-neutral-200": "border-white/8",
  "text-slate-600": "text-white/60",
  "text-slate-500": "text-white/40",
  "text-gray-900": "text-white/90",
  "text-gray-800": "text-white/80",
  "text-gray-600": "text-white/50",
  "text-gray-500": "text-white/25",
  "text-gray-400": "text-white/30",
  "text-neutral-600": "text-white/25",
  "text-neutral-800": "text-white/30",
  "text-neutral-900": "text-white/40",
  "from-[#A01717]": "from-[#704900]",
  "to-[#C10000]": "to-[#f3c91c]",
  "hover:bg-gray-200": "hover:bg-white/15",
  "hover:text-gray-900": "hover:text-white/90",
};

function applyFooterTheme(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child))
      return child;

    const className = child.props.className?.replace(
      /\S+/g,
      (token) => darkClassReplacements[token] ?? token,
    );

    return cloneElement(child, {
      ...(className ? { className } : {}),
      children: applyFooterTheme(child.props.children),
    });
  });
}

export default function Footer({ theme = "light" }: FooterProps) {
  const footerNavLinks = navLinks;

  const content = (
    <footer className="border-t border-white/10 bg-[#1C3715] text-white">
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Localização do Panda Lounge</h2>
          <iframe
            title="Mapa do Panda Lounge em Santa Vitória do Palmar"
            src="https://www.google.com/maps?q=-33.520163%2C-53.3687179&z=17&output=embed"
            width="100%"
            height="400"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="h-[300px] w-full rounded-2xl border-0 sm:h-[400px]"
          />
        </div>
      </section>

      <div className="pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12">
            {/* Brand Info & Mission */}
            <div className="lg:col-span-2 space-y-4">
              <Link
                href="/"
                className={`inline-flex items-center ${theme === "dark" ? "gap-3" : "gap-2.5"}`}
              >
                <Image
                  src={theme === "dark" ? "/logo.png" : "/logo.png"}
                alt="Panda Lounge"
                  width={160}
                  height={90}
                  className={
                    theme === "dark"
                      ? "h-16 w-auto object-contain"
                      : "h-16 w-auto object-contain"
                  }
                />
              </Link>

              <p className="max-w-sm text-sm leading-relaxed text-white/70 md:text-base">
                Restaurante e bar com hambúrgueres, sushi e drinks em Santa
                Vitória do Palmar.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href={storeInfo.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  title="Panda Lounge no Google Maps"
                  aria-label="Google Maps"
                >
                  <MapPin className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h4
                className="text-sm font-bold uppercase tracking-wider text-white md:text-base"
              >
                Navegação
              </h4>
              <ul className="ui-action space-y-2">
                {footerNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`transition-colors hover:underline underline-offset-4 ${
                        link.highlight
                          ? theme === "dark"
                            ? "font-medium text-white/50 hover:text-white/80"
                            : "font-medium text-white/75 hover:text-white"
                          : theme === "dark"
                            ? "text-white/50 hover:text-brand-red"
                            : "text-white/75 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Hours */}
            <div className="space-y-3">
              <h4
                className="text-sm font-bold uppercase tracking-wider text-white md:text-base"
              >
                Localização
              </h4>
              <div className="space-y-2.5 text-sm text-white/75 md:text-base">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-white/50" />
                  <span>
                    <a
                      href={storeInfo.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white"
                    >
                      {storeInfo.street}
                      <br />
                      {storeInfo.city} - {storeInfo.state}, {storeInfo.postalCode}
                    </a>
                  </span>
                </div>
                <div className="pt-1">
                  <p className="font-semibold text-white">Horário de funcionamento</p>
                  <p className="mt-1 text-white/70">Quarta a domingo: 19h à meia-noite</p>
                  <p className="text-white/70">Segunda e terça: fechado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-4 border-t border-white/15 py-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2
                className="text-base font-bold text-white"
              >
                Formas de pagamento
              </h2>
              <p className="mt-1 text-sm text-white/65">
                Consulte as opções disponíveis no fechamento do pedido.
              </p>
            </div>

            <ul className="flex flex-wrap items-center gap-2.5">
              {paymentMethods.map((method) => (
                <li key={method.name} className="shrink-0 rounded-md bg-white px-1.5 py-1">
                  <Image
                    src={method.src}
                    alt={method.name}
                    width={48}
                    height={32}
                    unoptimized
                    className={`h-8 w-12 object-contain ${theme === "dark" ? "opacity-60 grayscale invert transition hover:opacity-100 hover:grayscale-0" : ""}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Informações comerciais */}
        <div className="border-y border-white/10 bg-black/15 text-white/70">
          <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs leading-relaxed sm:px-6 md:text-sm lg:px-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-white/80">
              <span>Panda Lounge</span>
              <span>·</span>
              <span>Santa Vitória do Palmar - RS</span>
            </div>

            <p>
              <strong className="text-white">Informações da loja:</strong>{" "}
              Confira no Google Maps a localização do restaurante.
            </p>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 py-6 text-sm text-white/65 sm:flex-row md:text-base">
            <p>
              © 2026 {storeInfo.name}. Todos os direitos reservados. {storeInfo.city}
              - {storeInfo.state}.
            </p>
            <p className="flex items-center gap-1 text-sm">
              Restaurante e bar em Santa Vitória do Palmar
            </p>
          </div>
        </div>
      </div>
    </footer>
  );

  return theme === "dark" ? applyFooterTheme(content) : content;
}
