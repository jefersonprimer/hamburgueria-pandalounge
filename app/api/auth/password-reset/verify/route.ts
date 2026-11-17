import { NextResponse } from "next/server";
import { createVerifiedResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Informe o código de 6 dígitos enviado por e-mail." }, { status: 400 });
    }
    const resetToken = await createVerifiedResetToken(email, code);
    if (!resetToken) {
      return NextResponse.json({ error: "Código inválido ou expirado. Confira o código e tente novamente." }, { status: 400 });
    }
    return NextResponse.json({ resetToken });
  } catch (error) {
    console.error("Erro ao validar código de redefinição:", error);
    return NextResponse.json({ error: "Não foi possível validar o código agora." }, { status: 500 });
  }
}
