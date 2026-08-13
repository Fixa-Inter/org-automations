var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var index_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const eventType = request.headers.get("x-github-event");
    const isValid = await verifySignature(rawBody, signature, env.WEBHOOK_SECRET);
    if (!isValid) {
      return new Response("Assinatura inv\xE1lida", { status: 401 });
    }
    if (eventType !== "repository") {
      return new Response(`Ignorado (evento: ${eventType})`, { status: 200 });
    }
    const payload = JSON.parse(rawBody);
    if (payload.action !== "created") {
      return new Response("Ignorado (n\xE3o \xE9 cria\xE7\xE3o)", { status: 200 });
    }
    const dispatchResp = await fetch(
      `https://api.github.com/repos/${env.ORG}/org-automations/dispatches`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GH_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "encaminhador-worker"
        },
        body: JSON.stringify({
          event_type: "repo-criado",
          client_payload: {
            repo: payload.repository.name,
            org: payload.organization.login
          }
        })
      }
    );
    if (!dispatchResp.ok) {
      const errorText = await dispatchResp.text();
      console.error(`Dispatch falhou: ${dispatchResp.status} - ${errorText}`);
    } else {
      console.log(`Dispatch enviado com sucesso: ${dispatchResp.status}`);
    }
    return new Response("Encaminhado", { status: 200 });
  }
};
async function verifySignature(body, signatureHeader, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = "sha256=" + Buffer.from(signatureBuffer).toString("hex");
  return digest === signatureHeader;
}
__name(verifySignature, "verifySignature");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
