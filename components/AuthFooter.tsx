import Link from "next/link";

export default function AuthFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#1C3715] text-xs text-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
          <span className="font-semibold text-white">Panda Lounge</span>
          <span>R. Mirapalhete, 1339 - Centro</span>
          <span>Santa Vitória do Palmar - RS, 96230-000</span>
        </div>
        <Link
          href="/politica-de-privacidade"
          className="w-fit font-medium text-white underline-offset-4 hover:underline"
        >
          Política de Privacidade
        </Link>
      </div>
    </footer>
  );
}
