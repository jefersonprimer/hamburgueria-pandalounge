import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { pool, query } from "@/lib/db";
import { sendSmtpMail } from "@/lib/smtp-mail";
import { siteUrl } from "@/lib/seo";

let schemaReady: Promise<void> | undefined;

async function ensureSchema() {
  schemaReady ??= query(`
    CREATE TABLE IF NOT EXISTS public.password_reset_codes (
      email VARCHAR(255) PRIMARY KEY,
      code_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified_token_hash VARCHAR(64),
      verified_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).then(() => undefined).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  await schemaReady;
}

export const hashResetValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function sendResetCode(email: string, name: string) {
  await ensureSchema();
  const existing = await query<{ created_at: Date }>(
    "SELECT created_at FROM public.password_reset_codes WHERE email = $1",
    [email],
  );
  if (existing[0] && Date.now() - new Date(existing[0].created_at).getTime() < 60_000) {
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashResetValue(code);
  await query(
    `INSERT INTO public.password_reset_codes (email, code_hash, expires_at, attempts, verified_token_hash, verified_expires_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0, NULL, NULL, NOW())
     ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash,
       expires_at = EXCLUDED.expires_at, attempts = 0,
       verified_token_hash = NULL, verified_expires_at = NULL, created_at = NOW()`,
    [email, codeHash],
  );

  try {
    const brandName = "Supermercado Bertoletti";
    const logoUrl = new URL("/logo-name.png", siteUrl).toString();
    const safeEmail = escapeHtml(email);
    const safeName = escapeHtml(name);
    const text = `Olá, ${name}!\n\nPara garantir a sua segurança, copie o código abaixo e volte à página de recuperação de senha para continuar.\n\nSeu código de verificação é:\n\n${code}\n\nEste código expira em 10 minutos. Se você não solicitou esse código, é possível que outra pessoa esteja tentando acessar sua conta no ${brandName} utilizando o seu e-mail ${email}.\n\nNão encaminhe nem informe este código a ninguém.\n\n---\nATENDIMENTO — ${brandName}\nAv. João Muñiz Reis, 1218 — Frederico Westphalen/RS\nTelefone: (55) 3744-1545\nWhatsApp: (55) 98424-1546\nHorários: segunda a sexta, 08h às 12h e 13h30 às 19h30; sábado, 08h às 19h30; domingo, fechado.\n\nNossas redes sociais:\nInstagram: https://www.instagram.com/superbertoletti\nFacebook: https://www.facebook.com/superbertoletti/\nTikTok: https://www.tiktok.com/@superbertoletti\n\nVeja nossas políticas: Política de Cancelamento; Política de Troca e Devolução; Contrato de Compra e Venda.`;
    await sendSmtpMail({
      from: process.env.SMTP_FROM ?? "",
      to: email,
      subject: `Seu código de verificação | ${brandName}`,
      text,
      html: `<div style="margin:0;background:#f5f5f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#252525"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden"><div style="padding:24px 32px;text-align:center;border-bottom:1px solid #eee"><img src="${logoUrl}" alt="${brandName}" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin:0 auto"></div><div style="padding:32px"><p style="margin:0 0 16px;font-size:16px">Olá, ${safeName}!</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6">Para garantir a sua segurança, copie o código abaixo e volte à página de recuperação de senha para continuar.</p><p style="margin:0 0 8px;font-size:14px">Seu código de verificação é:</p><div style="margin:0 0 24px;padding:18px;text-align:center;background:#fff8f8;border:1px solid #f1dada;border-radius:8px;color:#A01717;font-size:32px;font-weight:bold;letter-spacing:8px">${code}</div><p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#555">Este código expira em 10 minutos. Se você não solicitou esse código, é possível que outra pessoa esteja tentando acessar sua conta no ${brandName} utilizando o e-mail <strong>${safeEmail}</strong>.</p><p style="margin:0;font-size:13px;line-height:1.6;color:#555"><strong>Não encaminhe nem informe este código a ninguém.</strong></p></div><div style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;font-size:12px;line-height:1.7;color:#666"><p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#333">Atendimento — ${brandName}</p><p style="margin:0 0 10px">Av. João Muñiz Reis, 1218 · Frederico Westphalen/RS<br>Telefone: <a href="tel:+555537441545" style="color:#A01717">(55) 3744-1545</a> · WhatsApp: <a href="https://wa.me/5555984241546" style="color:#A01717">(55) 98424-1546</a><br>Horários: segunda a sexta, 08h às 12h e 13h30 às 19h30; sábado, 08h às 19h30; domingo, fechado.</p><p style="margin:0 0 8px;font-weight:bold;color:#333">Nossas redes sociais</p><p style="margin:0 0 12px;text-align:center"><a href="https://www.facebook.com/superbertoletti/" aria-label="Facebook" style="display:inline-block;margin:0 8px;text-decoration:none"><img src="${new URL('/facebook-email.png', siteUrl).toString()}" width="24" height="24" alt="Facebook" style="display:block;width:24px;height:24px;border:0"></a><a href="https://www.instagram.com/superbertoletti" aria-label="Instagram" style="display:inline-block;margin:0 8px;text-decoration:none"><img src="${new URL('/instagram-email.png', siteUrl).toString()}" width="24" height="24" alt="Instagram" style="display:block;width:24px;height:24px;border:0"></a><a href="https://www.tiktok.com/@superbertoletti" aria-label="TikTok" style="display:inline-block;margin:0 8px;text-decoration:none"><img src="${new URL('/tiktok-email.png', siteUrl).toString()}" width="24" height="24" alt="TikTok" style="display:block;width:24px;height:24px;border:0"></a><a href="https://wa.me/5555984241546" aria-label="WhatsApp" style="display:inline-block;margin:0 8px;text-decoration:none"><img src="${new URL('/whatsapp-email.png', siteUrl).toString()}" width="24" height="24" alt="WhatsApp" style="display:block;width:24px;height:24px;border:0"></a></p><p style="margin:0"><strong style="color:#333">Veja nossas políticas:</strong><br>Política de Cancelamento · Política de Troca e Devolução · Contrato de Compra e Venda.</p></div></div></div>`,
    });
  } catch (error) {
    await query(
      "DELETE FROM public.password_reset_codes WHERE email = $1 AND code_hash = $2",
      [email, codeHash],
    );
    throw error;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function createVerifiedResetToken(email: string, code: string) {
  await ensureSchema();
  const rows = await query<{ code_hash: string; attempts: number; expires_at: Date }>(
    `SELECT code_hash, attempts, expires_at FROM public.password_reset_codes
     WHERE email = $1 AND expires_at > NOW()`, [email],
  );
  const record = rows[0];
  if (!record || record.attempts >= 5) return null;
  const submittedHash = Buffer.from(hashResetValue(code), "hex");
  const storedHash = Buffer.from(record.code_hash, "hex");
  if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
    await query("UPDATE public.password_reset_codes SET attempts = attempts + 1 WHERE email = $1", [email]);
    return null;
  }
  const token = randomBytes(32).toString("hex");
  await query(
    `UPDATE public.password_reset_codes SET verified_token_hash = $2,
     verified_expires_at = NOW() + INTERVAL '10 minutes' WHERE email = $1`,
    [email, hashResetValue(token)],
  );
  return token;
}

export async function resetPasswordWithToken(email: string, token: string, passwordHash: string) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const authorization = await client.query(
      `DELETE FROM public.password_reset_codes
       WHERE email = $1 AND verified_token_hash = $2 AND verified_expires_at > NOW()
       RETURNING email`,
      [email, hashResetValue(token)],
    );
    if (authorization.rowCount !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    const updated = await client.query(
      "UPDATE public.users SET password_hash = $2, updated_at = NOW() WHERE email = $1",
      [email, passwordHash],
    );
    if (updated.rowCount !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("DELETE FROM public.sessions WHERE user_id = (SELECT id FROM public.users WHERE email = $1)", [email]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
