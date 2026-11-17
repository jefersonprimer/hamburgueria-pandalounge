import net from "node:net";
import tls from "node:tls";
import type { Socket } from "node:net";

function responseReader(socket: Socket) {
  let pending = "";
  const queued: string[] = [];
  let waiter: ((line: string) => void) | undefined;
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (waiter) {
        const resolve = waiter;
        waiter = undefined;
        resolve(line);
      } else queued.push(line);
    }
  });
  return () => queued.length
    ? Promise.resolve(queued.shift()!)
    : new Promise<string>((resolve, reject) => {
        waiter = resolve;
        socket.once("error", reject);
        socket.once("close", () => reject(new Error("Conexão SMTP encerrada.")));
      });
}

async function readReply(readLine: () => Promise<string>) {
  const lines: string[] = [];
  let line = await readLine();
  lines.push(line);
  while (/^\d{3}-/.test(line)) {
    line = await readLine();
    lines.push(line);
  }
  const code = Number(lines[lines.length - 1]?.slice(0, 3));
  if (![220, 221, 235, 250, 251, 334, 354].includes(code)) {
    const reason = code === 535
      ? " (usuário ou senha SMTP rejeitados; Gmail exige uma senha de app válida)"
      : "";
    throw new Error(`Servidor SMTP respondeu ${code}${reason}.`);
  }
  return code;
}

export async function sendSmtpMail(input: { to: string; from: string; subject: string; text: string; html: string }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  if (!host || !port || !username || !password || !input.from) {
    throw new Error("Configuração SMTP incompleta.");
  }
  if (port !== 587 && port !== 465) throw new Error("Use SMTP_PORT 587 ou 465.");
  let socket: Socket = port === 465
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.setTimeout(15_000, () => reject(new Error("Tempo limite de conexão SMTP.")));
  });
  let readLine = responseReader(socket);
  const command = async (value: string) => {
    socket.write(`${value}\r\n`);
    return readReply(readLine);
  };
  try {
    await readReply(readLine);
    await command("EHLO localhost");
    if (port === 587) {
      await command("STARTTLS");
      socket = tls.connect({ socket, servername: host });
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", resolve);
        socket.once("error", reject);
      });
      readLine = responseReader(socket);
      await command("EHLO localhost");
    }
    await command("AUTH LOGIN");
    await command(Buffer.from(username).toString("base64"));
    await command(Buffer.from(password).toString("base64"));
    await command(`MAIL FROM:<${input.from}>`);
    await command(`RCPT TO:<${input.to}>`);
    await command("DATA");
    const encodedText = Buffer.from(input.text, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
    const encodedHtml = Buffer.from(input.html, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
    const boundary = `reset-${Date.now().toString(36)}`;
    const message = [
      `From: <${input.from}>`, `To: <${input.to}>`, `Subject: ${input.subject}`,
      "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary=\"${boundary}\"`, "",
      `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encodedText,
      `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encodedHtml,
      `--${boundary}--`,
    ].join("\r\n").replace(/(^|\r\n)\./g, "$1..");
    socket.write(`${message}\r\n.\r\n`);
    await readReply(readLine);
    await command("QUIT");
  } finally {
    socket.end();
  }
}
