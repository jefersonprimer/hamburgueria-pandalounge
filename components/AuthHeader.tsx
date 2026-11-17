import Image from "next/image";
import Link from "next/link";

export default function AuthHeader() {
  return (
    <header className="h-20 shrink-0 border-b border-white/10 bg-[#1C3715] sm:h-24">
      <div className="mx-auto flex h-full max-w-7xl items-center px-5 sm:px-8">
        <Link href="/" aria-label="Panda Lounge — página inicial">
          <Image
            src="/logo.png"
            alt="Panda Lounge"
            width={160}
            height={90}
            priority
            className="h-16 w-auto object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
