import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendResetCode } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    const users = await query<{ name: string }>(
      "SELECT name FROM public.users WHERE email = $1 LIMIT 1", [email],
    );
    if (users[0]) await sendResetCode(email, users[0].name);
    return NextResponse.json({ message: "Se o e-mail estiver cadastrado, você receberá um código em instantes." });
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return NextResponse.json({ error: "Não foi possível enviar o código agora. Tente novamente." }, { status: 500 });
  }
}
