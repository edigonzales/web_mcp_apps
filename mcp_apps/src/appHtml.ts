import {
  MCP_APPS_PROTOCOL_VERSION,
  OEREB_APP_TITLE,
  OEREB_BASE_URL,
  SERVER_VERSION
} from "./constants.js";

export function createOerebAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="de-CH">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${OEREB_APP_TITLE}</title>
    <style>
      :root {
        color-scheme: light dark;
        --background: #f7f7f4;
        --surface: #ffffff;
        --surface-muted: #eceae3;
        --text: #1d252b;
        --text-muted: #58636d;
        --border: #d7d3ca;
        --accent: #0f6b55;
        --accent-strong: #0b4d3e;
        --shadow: 0 10px 30px rgba(29, 37, 43, 0.12);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --background: #151817;
          --surface: #202522;
          --surface-muted: #2b302c;
          --text: #eef1ed;
          --text-muted: #aeb7af;
          --border: #424942;
          --accent: #59c6a6;
          --accent-strong: #7edcbc;
          --shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        background: var(--background);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .shell {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 100vh;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
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

      .status {
        min-width: 0;
        color: var(--text-muted);
        font-size: 13px;
        overflow-wrap: anywhere;
        text-align: right;
      }

      main {
        min-height: 0;
        padding: 12px;
      }

      .empty {
        display: grid;
        place-items: center;
        min-height: calc(100vh - 86px);
        color: var(--text-muted);
        text-align: center;
      }

      .map {
        display: grid;
        grid-template-rows: auto minmax(520px, 1fr);
        min-height: calc(100vh - 86px);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      .map[hidden],
      .empty[hidden] {
        display: none;
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      .egrid {
        min-width: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      a {
        flex: 0 0 auto;
        border: 1px solid var(--accent);
        border-radius: 6px;
        padding: 8px 10px;
        color: var(--accent-strong);
        font-size: 13px;
        font-weight: 650;
        text-decoration: none;
      }

      a:hover {
        background: var(--surface-muted);
      }

      iframe {
        width: 100%;
        height: 100%;
        min-height: 520px;
        border: 0;
        background: var(--surface-muted);
      }

      @media (max-width: 640px) {
        header,
        .toolbar {
          align-items: flex-start;
          flex-direction: column;
        }

        .status {
          text-align: left;
        }

        main {
          padding: 8px;
        }

        .map {
          min-height: calc(100vh - 104px);
          grid-template-rows: auto minmax(460px, 1fr);
        }

        iframe {
          min-height: 460px;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <h1>${OEREB_APP_TITLE}</h1>
        <div id="status" class="status">Warte auf EGRID...</div>
      </header>
      <main>
        <section id="empty" class="empty">
          <p>Der Host übergibt das EGRID nach dem Tool-Aufruf.</p>
        </section>
        <section id="map" class="map" hidden>
          <div class="toolbar">
            <strong id="egrid" class="egrid"></strong>
            <a id="openLink" href="${OEREB_BASE_URL}" target="_blank" rel="noopener noreferrer">In geo.so.ch öffnen</a>
          </div>
          <iframe id="gisFrame" title="${OEREB_APP_TITLE}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </section>
      </main>
    </div>
    <script>
      (() => {
        const appInfo = { name: "${OEREB_APP_TITLE}", version: "${SERVER_VERSION}" };
        const protocolVersion = "${MCP_APPS_PROTOCOL_VERSION}";
        const baseUrl = "${OEREB_BASE_URL}";
        const egridPattern = /^CH\\d{12}$/;
        let nextRequestId = 1;
        const pendingRequests = new Map();

        const elements = {
          status: document.getElementById("status"),
          empty: document.getElementById("empty"),
          map: document.getElementById("map"),
          egrid: document.getElementById("egrid"),
          openLink: document.getElementById("openLink"),
          gisFrame: document.getElementById("gisFrame")
        };

        function post(message) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, "*");
          }
        }

        function notify(method, params = {}) {
          post({ jsonrpc: "2.0", method, params });
        }

        function request(method, params = {}) {
          const id = nextRequestId++;
          post({ jsonrpc: "2.0", id, method, params });
          return new Promise((resolve, reject) => {
            pendingRequests.set(id, { resolve, reject });
            window.setTimeout(() => {
              if (!pendingRequests.has(id)) {
                return;
              }
              pendingRequests.delete(id);
              reject(new Error(method + " hat keine Antwort vom Host erhalten."));
            }, 5000);
          });
        }

        function buildUrl(egrid) {
          const url = new URL(baseUrl);
          url.search = new URLSearchParams({ oereb_egrid: egrid }).toString();
          return url.toString();
        }

        function renderEgrid(egrid, url = buildUrl(egrid)) {
          if (!egridPattern.test(egrid)) {
            elements.status.textContent = "Ungültiges EGRID erhalten.";
            return;
          }

          elements.status.textContent = "ÖREB-Kataster geladen.";
          elements.egrid.textContent = egrid;
          elements.openLink.href = url;
          elements.gisFrame.src = url;
          elements.empty.hidden = true;
          elements.map.hidden = false;
          sendSize();
        }

        function extractFromToolResult(result) {
          const structured = result && result.structuredContent;
          if (structured && typeof structured.egrid === "string") {
            return {
              egrid: structured.egrid,
              url: typeof structured.url === "string" ? structured.url : undefined
            };
          }

          const metaOereb = result && result._meta && result._meta.oereb;
          if (metaOereb && typeof metaOereb.egrid === "string") {
            return {
              egrid: metaOereb.egrid,
              url: typeof metaOereb.url === "string" ? metaOereb.url : undefined
            };
          }

          return null;
        }

        function applyToolArguments(args) {
          if (args && typeof args.egrid === "string") {
            renderEgrid(args.egrid);
          }
        }

        function applyToolResult(result) {
          const extracted = extractFromToolResult(result);
          if (extracted) {
            renderEgrid(extracted.egrid, extracted.url);
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
          if (event.source !== window.parent) {
            return;
          }

          const message = event.data;
          if (!message || message.jsonrpc !== "2.0") {
            return;
          }

          if (Object.prototype.hasOwnProperty.call(message, "id") && (message.result || message.error)) {
            const pending = pendingRequests.get(message.id);
            if (!pending) {
              return;
            }
            pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(message.error);
            } else {
              pending.resolve(message.result);
            }
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
            notify("ui/notifications/initialized", {});
            const toolInfo = result && result.hostContext && result.hostContext.toolInfo;
            const toolArguments = toolInfo && toolInfo.tool && toolInfo.tool.arguments;
            applyToolArguments(toolArguments);
            sendSize();
          })
          .catch(() => {
            elements.status.textContent = "Host-Initialisierung nicht bestätigt. Der Direktlink bleibt verfügbar, sobald ein EGRID eintrifft.";
          });
      })();
    </script>
  </body>
</html>`;
}
