"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

type Step = "email" | "code" | "password" | "done";

export default function RecoverPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(path: string, payload: Record<string, string>) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível concluir esta etapa.");
      return data;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Ocorreu um erro. Tente novamente.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    const result = await submit("/api/auth/password-reset/request", { email });
    if (result) {
      setMessage(result.message);
      setStep("code");
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    const result = await submit("/api/auth/password-reset/verify", {
      email,
      code,
    });
    if (result) {
      setResetToken(result.resetToken);
      setStep("password");
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }
    const result = await submit("/api/auth/password-reset/complete", {
      email,
      resetToken,
      password,
    });
    if (result) setStep("done");
  }

  const title = {
    email: "Recuperar senha",
    code: "Confira seu e-mail",
    password: "Crie uma nova senha",
    done: "Senha alterada",
  }[step];

  return (
    <main className="flex flex-1 items-center justify-center bg-[#1C3715] px-4 py-10 sm:px-6">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
        <header className="space-y-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {title}
          </h1>
        </header>

        {message && step !== "done" && (
          <p
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {step === "email" && (
          <form onSubmit={requestCode} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base text-gray-900 outline-none transition focus:border-brand-red focus:bg-white focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <Link
              href="/login"
              className="ui-action flex items-center justify-end gap-2 text-gray-600 transition hover:text-brand-red-dark hover:underline"
            >
              Voltar para entrar
            </Link>
            <button
              disabled={loading}
              className="ui-action flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-brand-red-dark px-4 py-4 text-white shadow-sm transition hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
              código
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="code"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Código de verificação
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl font-semibold tracking-[0.4em] text-gray-900 outline-none transition focus:border-brand-red focus:bg-white focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <button
              disabled={loading}
              className="ui-action flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-brand-red-dark px-4 py-4 text-white shadow-sm transition hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Validar
              código
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setMessage("");
                setError("");
              }}
              className="ui-action w-full text-brand-red-dark hover:underline"
            >
              Usar outro e-mail
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={updatePassword} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Nova senha
              </label>
              <PasswordInput
                id="new-password"
                required
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo de 8 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Confirmar nova senha
              </label>
              <PasswordInput
                id="confirm-password"
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={setConfirmation}
                placeholder="Digite a senha novamente"
              />
            </div>
            <button
              disabled={loading}
              className="ui-action flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-brand-red-dark px-4 py-4 text-white shadow-sm transition hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              nova senha
            </button>
          </form>
        )}

        {step === "done" && (
          <Link
            href="/login"
            className="ui-action block w-full rounded-xl bg-brand-red-dark px-4 py-3.5 text-center text-white transition hover:bg-brand-red"
          >
            Ir para o login
          </Link>
        )}
      </section>
    </main>
  );
}
