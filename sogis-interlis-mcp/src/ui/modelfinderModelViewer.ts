import {
  MCP_APPS_PROTOCOL_VERSION,
  MODELFINDER_MODEL_VIEWER_TITLE,
  SERVER_VERSION
} from "../constants.js";
import { ensureTrailingSlash } from "../util/urls.js";

export function createModelfinderModelViewerHtml(baseUrl: string): string {
  const normalizedBaseUrl = ensureTrailingSlash(baseUrl);
  return String.raw`<!doctype html>
<html lang="de-CH">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${MODELFINDER_MODEL_VIEWER_TITLE}</title>
    <style>
      :root {
        color-scheme: light dark;
        --background: #f7f7f4;
        --surface: #ffffff;
        --surface-muted: #efeee9;
        --text: #1e252b;
        --muted: #5f6870;
        --border: #d7d3ca;
        --accent: #12624f;
        --accent-soft: #dcefe9;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --background: #151817;
          --surface: #202522;
          --surface-muted: #2b302c;
          --text: #eef1ed;
          --muted: #aeb7af;
          --border: #424942;
          --accent: #64c7a8;
          --accent-soft: #173a31;
        }
      }

      * { box-sizing: border-box; }

      body {
        min-height: 100vh;
        margin: 0;
        background: var(--background);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .shell {
        display: grid;
        grid-template-rows: auto auto minmax(520px, 1fr);
        min-height: 100vh;
      }

      header,
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      h1 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: 0;
      }

      .meta {
        min-width: 0;
        color: var(--muted);
        font-size: 13px;
        overflow-wrap: anywhere;
        text-align: right;
      }

      .url {
        min-width: 0;
        flex: 1 1 auto;
        color: var(--muted);
        font: 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        overflow-wrap: anywhere;
      }

      button,
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        border: 1px solid var(--accent);
        border-radius: 6px;
        padding: 6px 10px;
        background: var(--accent-soft);
        color: var(--accent);
        font: inherit;
        font-size: 13px;
        font-weight: 650;
        text-decoration: none;
        cursor: pointer;
      }

      button:hover,
      a:hover { background: var(--surface-muted); }

      .frame-wrap {
        display: grid;
        grid-template-rows: 1fr auto;
        min-height: 520px;
        padding: 12px;
      }

      iframe {
        width: 100%;
        height: 100%;
        min-height: 500px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-muted);
      }

      .note {
        padding: 8px 2px 0;
        color: var(--muted);
        font-size: 13px;
      }

      @media (max-width: 720px) {
        header,
        .toolbar {
          align-items: flex-start;
          flex-direction: column;
        }
        .meta { text-align: left; }
        .shell { grid-template-rows: auto auto minmax(460px, 1fr); }
        .frame-wrap { min-height: 460px; padding: 8px; }
        iframe { min-height: 440px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <h1>${MODELFINDER_MODEL_VIEWER_TITLE}</h1>
        <div id="meta" class="meta">Warte auf Suchkontext...</div>
      </header>
      <div class="toolbar">
        <div id="urlText" class="url">${escapeForHtml(normalizedBaseUrl)}</div>
        <a id="openLink" href="${escapeForHtml(normalizedBaseUrl)}" target="_blank" rel="noopener noreferrer">Im Modelfinder öffnen</a>
        <button id="copyButton" type="button">Suchlink kopieren</button>
        <button id="explainButton" type="button">Suche im Chat erklären</button>
      </div>
      <div class="frame-wrap">
        <iframe id="frame" title="${MODELFINDER_MODEL_VIEWER_TITLE}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${escapeForHtml(normalizedBaseUrl)}"></iframe>
        <div id="note" class="note">Falls die Einbettung durch Host-CSP oder Frame-Policies blockiert wird, nutze den Link oben.</div>
      </div>
    </div>

    <script>
      (() => {
        const appInfo = { name: "${MODELFINDER_MODEL_VIEWER_TITLE}", version: "${SERVER_VERSION}" };
        const protocolVersion = "${MCP_APPS_PROTOCOL_VERSION}";
        const baseUrl = "${escapeForJs(normalizedBaseUrl)}";
        let nextRequestId = 1;
        const pendingRequests = new Map();
        const state = {
          hostCapabilities: {},
          query: null,
          ilisite: null,
          expanded: true,
          url: baseUrl
        };

        const elements = {
          meta: document.getElementById("meta"),
          urlText: document.getElementById("urlText"),
          openLink: document.getElementById("openLink"),
          copyButton: document.getElementById("copyButton"),
          explainButton: document.getElementById("explainButton"),
          frame: document.getElementById("frame"),
          note: document.getElementById("note")
        };

        function post(message) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, "*");
          }
        }

        function notify(method, params = {}) {
          post({ jsonrpc: "2.0", method, params });
        }

        function request(method, params = {}, timeoutMs = 30000) {
          const id = nextRequestId++;
          post({ jsonrpc: "2.0", id, method, params });
          return new Promise((resolve, reject) => {
            pendingRequests.set(id, { resolve, reject });
            window.setTimeout(() => {
              if (!pendingRequests.has(id)) return;
              pendingRequests.delete(id);
              reject(new Error(method + " hat keine Antwort vom Host erhalten."));
            }, timeoutMs);
          });
        }

        function applyToolArguments(args) {
          if (!args || typeof args !== "object") return;
          if (typeof args.query === "string") state.query = args.query;
          if (typeof args.ilisite === "string") state.ilisite = args.ilisite;
          if (typeof args.expanded === "boolean") state.expanded = args.expanded;
          if (typeof args.url === "string") state.url = args.url;
          rebuildOrLoadContext();
        }

        function applyToolResult(result) {
          const structured = result && result.structuredContent;
          const meta = result && result._meta && result._meta.modelfinder;
          const candidate = structured || meta;
          if (!candidate || typeof candidate !== "object") return;
          if (typeof candidate.query === "string") state.query = candidate.query;
          if (typeof candidate.ilisite === "string") state.ilisite = candidate.ilisite;
          if (typeof candidate.expanded === "boolean") state.expanded = candidate.expanded;
          if (typeof candidate.url === "string") state.url = candidate.url;
          if (candidate.ui && candidate.ui.params) applyToolArguments(candidate.ui.params);
          render();
        }

        async function rebuildOrLoadContext() {
          if (state.hostCapabilities.serverTools && state.query) {
            try {
              const result = await request("tools/call", {
                name: "get_modelfinder_context",
                arguments: {
                  query: state.query,
                  ilisite: state.ilisite,
                  expanded: state.expanded
                }
              });
              if (!result.isError && result.structuredContent && result.structuredContent.url) {
                state.url = result.structuredContent.url;
              }
            } catch {
              state.url = buildUrl();
            }
          } else {
            state.url = buildUrl();
          }
          render();
        }

        function buildUrl() {
          const url = new URL(baseUrl);
          if (state.query) url.searchParams.set("query", state.query);
          if (state.ilisite) url.searchParams.set("ilisite", state.ilisite);
          if (state.expanded) url.searchParams.set("expanded", "true");
          url.searchParams.set("nologo", "true");
          return url.toString();
        }

        function render() {
          elements.meta.textContent = state.query ? 'Suche "' + state.query + '"' + (state.ilisite ? " in " + state.ilisite : "") : "Modelfinder";
          elements.urlText.textContent = state.url;
          elements.openLink.href = state.url;
          elements.frame.src = state.url;
          sendSize();
        }

        async function copyText(text) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
          }
          const area = document.createElement("textarea");
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }

        async function explainSearch() {
          const text = "Bitte erkläre den INTERLIS-Modelfinder-Kontext für diese Suche: " + state.url;
          try {
            await request("ui/message", { role: "user", content: [{ type: "text", text }] }, 5000);
            elements.note.textContent = "Anfrage an den Chat gesendet.";
          } catch {
            await copyText(text);
            elements.note.textContent = "Host unterstützt keine Chat-Nachricht. Text wurde kopiert.";
          }
        }

        function sendSize() {
          const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
          const width = Math.ceil(document.documentElement.getBoundingClientRect().width || window.innerWidth);
          notify("ui/notifications/size-changed", { width, height });
        }

        function handleRequest(message) {
          if (message.method === "ui/resource-teardown") {
            post({ jsonrpc: "2.0", id: message.id, result: {} });
          }
        }

        window.addEventListener("message", (event) => {
          if (event.source !== window.parent) return;
          const message = event.data;
          if (!message || message.jsonrpc !== "2.0") return;

          if (Object.prototype.hasOwnProperty.call(message, "id") && (message.result || message.error)) {
            const pending = pendingRequests.get(message.id);
            if (!pending) return;
            pendingRequests.delete(message.id);
            message.error ? pending.reject(message.error) : pending.resolve(message.result);
            return;
          }
          if (Object.prototype.hasOwnProperty.call(message, "id") && message.method) {
            handleRequest(message);
            return;
          }
          if (message.method === "ui/notifications/tool-input") {
            applyToolArguments(message.params && message.params.arguments);
          }
          if (message.method === "ui/notifications/tool-result") {
            applyToolResult(message.params);
          }
        });

        elements.copyButton.addEventListener("click", async () => {
          await copyText(state.url);
          elements.note.textContent = "Suchlink kopiert.";
        });
        elements.explainButton.addEventListener("click", explainSearch);

        if ("ResizeObserver" in window) {
          const resizeObserver = new ResizeObserver(sendSize);
          resizeObserver.observe(document.documentElement);
          resizeObserver.observe(document.body);
        }

        request("ui/initialize", {
          appInfo,
          appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
          protocolVersion
        })
          .then((result) => {
            state.hostCapabilities = result.hostCapabilities || {};
            notify("ui/notifications/initialized", {});
            const toolInfo = result.hostContext && result.hostContext.toolInfo;
            const toolArguments = toolInfo && toolInfo.tool && toolInfo.tool.arguments;
            applyToolArguments(toolArguments);
            render();
          })
          .catch(() => {
            render();
            elements.note.textContent = "Host-Initialisierung nicht bestätigt. Der Link bleibt verwendbar.";
          });
      })();
    </script>
  </body>
</html>`;
}

function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeForJs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}
