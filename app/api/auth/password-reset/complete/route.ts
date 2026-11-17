import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "A nova senha deve ter entre 8 e 128 caracteres." }, { status: 400 });
    }
    if (!email || !resetToken) {
      return NextResponse.json({ error: "Valide seu código antes de continuar." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await resetPasswordWithToken(email, resetToken, passwordHash);
    if (!updated) {
      return NextResponse.json({ error: "Sua autorização expirou. Solicite um novo código." }, { status: 400 });
    }
    return NextResponse.json({ message: "Senha atualizada. Entre com sua nova senha." });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json({ error: "Não foi possível atualizar a senha agora." }, { status: 500 });
  }
}
