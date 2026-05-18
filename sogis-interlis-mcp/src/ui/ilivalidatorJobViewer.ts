import {
  ILIVALIDATOR_JOB_VIEWER_TITLE,
  MCP_APPS_PROTOCOL_VERSION,
  SERVER_VERSION
} from "../constants.js";

export function createIlivalidatorJobViewerHtml(): string {
  return String.raw`<!doctype html>
<html lang="de-CH">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${ILIVALIDATOR_JOB_VIEWER_TITLE}</title>
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
        --danger: #b42318;
        --warning: #9a6700;
        --success: #137333;
        --code: #172026;
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
          --danger: #ff8a80;
          --warning: #f6c66c;
          --success: #82d894;
          --code: #eef1ed;
        }
      }

      * { box-sizing: border-box; }

      html {
        margin: 0;
        padding: 0;
      }

      body {
        margin: 0;
        background: var(--background);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .shell {
        display: grid;
        grid-template-rows: auto 1fr;
        max-height: 960px;
        overflow: hidden;
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

      .meta {
        min-width: 0;
        color: var(--muted);
        font-size: 13px;
        text-align: right;
        overflow-wrap: anywhere;
      }

      main {
        display: grid;
        gap: 12px;
        padding: 12px;
      }

      section {
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        overflow: hidden;
      }

      .status-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1px;
        background: var(--border);
      }

      .metric {
        min-width: 0;
        padding: 12px;
        background: var(--surface);
      }

      .metric span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 5px;
      }

      .metric strong {
        display: block;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        border-radius: 999px;
        padding: 2px 10px;
        background: var(--surface-muted);
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
      }

      .badge.success { color: var(--success); background: rgba(19, 115, 51, 0.12); }
      .badge.warning { color: var(--warning); background: rgba(154, 103, 0, 0.12); }
      .badge.danger { color: var(--danger); background: rgba(180, 35, 24, 0.12); }

      .toolbar,
      .filters {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      button,
      input {
        min-height: 34px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        font: inherit;
        font-size: 13px;
      }

      button {
        cursor: pointer;
        padding: 6px 10px;
        font-weight: 650;
      }

      button:hover:not(:disabled) { background: var(--surface-muted); }
      button:disabled { cursor: not-allowed; opacity: 0.5; }
      button.primary { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

      input {
        flex: 1 1 220px;
        min-width: 140px;
        padding: 6px 9px;
      }

      .content {
        padding: 12px;
      }

      .empty {
        color: var(--muted);
        padding: 24px 12px;
        text-align: center;
      }

      .log {
        max-height: 360px;
        margin: 0;
        overflow: auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        color: var(--code);
        font: 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      th,
      td {
        padding: 8px;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      tr.selected { background: var(--accent-soft); }
      .message { overflow-wrap: anywhere; }
      .note { color: var(--muted); font-size: 13px; }

      @media (max-width: 720px) {
        header { align-items: flex-start; flex-direction: column; }
        .meta { text-align: left; }
        main { padding: 8px; }
        .status-grid { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <div id="appRoot" class="shell">
      <header>
        <h1>${ILIVALIDATOR_JOB_VIEWER_TITLE}</h1>
        <div id="headerMeta" class="meta">Warte auf Job...</div>
      </header>
      <main>
        <section>
          <div class="status-grid">
            <div class="metric"><span>Job</span><strong id="jobId">-</strong></div>
            <div class="metric"><span>Status</span><strong><span id="statusBadge" class="badge">UNKNOWN</span></strong></div>
            <div class="metric"><span>Resultat</span><strong id="validationResult">-</strong></div>
            <div class="metric"><span>Profil</span><strong id="profile">-</strong></div>
          </div>
          <div class="toolbar">
            <button id="refreshButton" class="primary" type="button">Status aktualisieren</button>
            <button id="copyJobButton" type="button">Job-ID kopieren</button>
            <span id="statusNote" class="note"></span>
          </div>
        </section>

        <section>
          <div class="toolbar">
            <button id="tabCsv" type="button">CSV-Log</button>
            <button id="tabText" type="button">Textlog</button>
            <button id="tabXtf" type="button">XTF-Log</button>
            <button id="copyLogButton" type="button">Log kopieren</button>
          </div>
          <div class="filters">
            <button id="filterAll" type="button">Alle</button>
            <button id="filterErrors" type="button">Fehler</button>
            <button id="filterWarnings" type="button">Warnungen</button>
            <input id="searchInput" type="search" placeholder="Log durchsuchen">
            <button id="explainButton" type="button">Fehler im Chat erklären</button>
            <button id="modelButton" type="button">Modellstelle suchen</button>
          </div>
          <div id="logContent" class="content">
            <div class="empty">Noch kein Log geladen.</div>
          </div>
        </section>
      </main>
    </div>

    <script>
      (() => {
        const appInfo = { name: "${ILIVALIDATOR_JOB_VIEWER_TITLE}", version: "${SERVER_VERSION}" };
        const protocolVersion = "${MCP_APPS_PROTOCOL_VERSION}";
        const MAX_EMBED_HEIGHT_PX = 960;
        let nextRequestId = 1;
        let sizeFrame = null;
        const pendingRequests = new Map();
        const state = {
          hostCapabilities: {},
          jobId: null,
          profile: null,
          autoRefresh: true,
          preferredLog: "csv",
          activeLog: "csv",
          filter: "all",
          job: null,
          logs: {},
          selectedRowIndex: null,
          refreshTimer: null
        };

        const elements = {
          appRoot: document.getElementById("appRoot"),
          headerMeta: document.getElementById("headerMeta"),
          jobId: document.getElementById("jobId"),
          statusBadge: document.getElementById("statusBadge"),
          validationResult: document.getElementById("validationResult"),
          profile: document.getElementById("profile"),
          statusNote: document.getElementById("statusNote"),
          refreshButton: document.getElementById("refreshButton"),
          copyJobButton: document.getElementById("copyJobButton"),
          tabCsv: document.getElementById("tabCsv"),
          tabText: document.getElementById("tabText"),
          tabXtf: document.getElementById("tabXtf"),
          copyLogButton: document.getElementById("copyLogButton"),
          filterAll: document.getElementById("filterAll"),
          filterErrors: document.getElementById("filterErrors"),
          filterWarnings: document.getElementById("filterWarnings"),
          searchInput: document.getElementById("searchInput"),
          explainButton: document.getElementById("explainButton"),
          modelButton: document.getElementById("modelButton"),
          logContent: document.getElementById("logContent")
        };
        const sizeState = {
          width: 0,
          height: 0
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
              if (!pendingRequests.has(id)) {
                return;
              }
              pendingRequests.delete(id);
              reject(new Error(method + " hat keine Antwort vom Host erhalten."));
            }, timeoutMs);
          });
        }

        function callTool(name, args, timeoutMs = 30000) {
          return request("tools/call", { name, arguments: args }, timeoutMs);
        }

        function applyToolArguments(args) {
          if (!args || typeof args !== "object") {
            return;
          }
          if (typeof args.jobId === "string") {
            state.jobId = args.jobId;
          }
          if (typeof args.profile === "string") {
            state.profile = args.profile;
          }
          if (typeof args.autoRefresh === "boolean") {
            state.autoRefresh = args.autoRefresh;
          }
          if (["text", "csv", "xtf"].includes(args.preferredLog)) {
            state.preferredLog = args.preferredLog;
            state.activeLog = args.preferredLog;
          }
          renderShell();
        }

        function applyToolResult(result) {
          const structured = result && result.structuredContent;
          const meta = result && result._meta && result._meta.ilivalidator;
          const candidate = structured || meta;
          if (!candidate || typeof candidate !== "object") {
            return;
          }
          if (typeof candidate.jobId === "string") {
            state.jobId = candidate.jobId;
          }
          if (typeof candidate.profile === "string") {
            state.profile = candidate.profile;
          }
          if (candidate.ui && candidate.ui.params && typeof candidate.ui.params.jobId === "string") {
            state.jobId = candidate.ui.params.jobId;
          }
          renderShell();
          if (state.jobId) {
            refreshJob();
          }
        }

        function renderShell() {
          elements.jobId.textContent = state.jobId ? shorten(state.jobId) : "-";
          elements.profile.textContent = state.profile || "-";
          elements.headerMeta.textContent = state.jobId ? "Job " + state.jobId : "Warte auf Job...";
          updateLogButtons();
          scheduleSizeUpdate();
        }

        function renderJob(job) {
          state.job = job;
          elements.jobId.textContent = shorten(job.jobId);
          elements.statusBadge.textContent = job.jobStatus || "UNKNOWN";
          elements.statusBadge.className = "badge " + badgeClass(job.jobStatus, job.validationResult);
          elements.validationResult.textContent = job.validationResult || "-";
          elements.profile.textContent = state.profile || "-";
          elements.headerMeta.textContent = "Job " + job.jobId;
          elements.statusNote.textContent = job.retryAfterSeconds ? "Nächste automatische Aktualisierung in " + job.retryAfterSeconds + " s." : "";
          updateLogButtons();
          scheduleSizeUpdate();
        }

        function updateLogButtons() {
          const logs = state.job && state.job.logs ? state.job.logs : {};
          elements.tabCsv.disabled = !logs.csv;
          elements.tabText.disabled = !logs.text;
          elements.tabXtf.disabled = !logs.xtf;
        }

        async function refreshJob() {
          if (!state.jobId) {
            elements.statusNote.textContent = "Kein Job im Tool-Kontext vorhanden.";
            return;
          }
          if (!state.hostCapabilities.serverTools) {
            elements.statusNote.textContent = "Dieser Host erlaubt der App keine direkten Tool-Aufrufe. Nutze get_validation_job im Chat oder die Tool-Antwort.";
            return;
          }

          window.clearTimeout(state.refreshTimer);
          elements.statusNote.textContent = "Lade Jobstatus...";
          const result = await callTool("get_validation_job", { jobId: state.jobId });
          if (result.isError) {
            elements.statusNote.textContent = extractError(result);
            return;
          }

          renderJob(result.structuredContent);
          if (result.structuredContent.jobStatus === "SUCCEEDED") {
            await loadLog(state.preferredLog);
            return;
          }

          if (state.autoRefresh) {
            const delay = Math.max(1, result.structuredContent.retryAfterSeconds || 5) * 1000;
            state.refreshTimer = window.setTimeout(refreshJob, delay);
          }
        }

        async function loadLog(kind) {
          state.activeLog = kind;
          state.selectedRowIndex = null;
          if (!state.jobId || !state.hostCapabilities.serverTools) {
            renderLog();
            return;
          }
          if (state.logs[kind]) {
            renderLog();
            return;
          }

          elements.statusNote.textContent = "Lade " + kind + "-Log...";
          const result = await callTool("get_validation_log", { jobId: state.jobId, kind });
          if (result.isError) {
            elements.statusNote.textContent = extractError(result);
            return;
          }
          state.logs[kind] = result.structuredContent;
          elements.statusNote.textContent = result.structuredContent.truncated ? "Log wurde gekürzt." : "";
          renderLog();
        }

        function renderLog() {
          const log = state.logs[state.activeLog];
          if (!log) {
            elements.logContent.innerHTML = '<div class="empty">Kein ' + escapeHtml(state.activeLog) + '-Log geladen.</div>';
            scheduleSizeUpdate();
            return;
          }

          if (state.activeLog === "csv" && Array.isArray(log.rows) && log.rows.length > 0) {
            renderRows(log.rows);
          } else {
            elements.logContent.innerHTML = '<pre class="log">' + escapeHtml(log.content || "") + '</pre>';
          }
          scheduleSizeUpdate();
        }

        function renderRows(rows) {
          const query = elements.searchInput.value.trim().toLowerCase();
          const filtered = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => {
              if (state.filter === "errors" && row.severity !== "ERROR") return false;
              if (state.filter === "warnings" && row.severity !== "WARNING") return false;
              if (query && !(row.message || "").toLowerCase().includes(query)) return false;
              return true;
            });
          const body = filtered.map(({ row, index }) => {
            const selected = state.selectedRowIndex === index ? ' class="selected"' : "";
            return '<tr data-index="' + index + '"' + selected + '>' +
              '<td>' + escapeHtml(row.severity || "-") + '</td>' +
              '<td>' + escapeHtml(row.line == null ? "-" : String(row.line)) + '</td>' +
              '<td>' + escapeHtml(row.object || "-") + '</td>' +
              '<td class="message">' + escapeHtml(row.message || "") + '</td>' +
              '</tr>';
          }).join("");
          elements.logContent.innerHTML = '<table><thead><tr><th>Severity</th><th>Zeile</th><th>Objekt</th><th>Meldung</th></tr></thead><tbody>' + body + '</tbody></table>';
          elements.logContent.querySelectorAll("tr[data-index]").forEach((row) => {
            row.addEventListener("click", () => {
              state.selectedRowIndex = Number(row.getAttribute("data-index"));
              renderLog();
            });
          });
        }

        function selectedRow() {
          const log = state.logs.csv;
          if (!log || !Array.isArray(log.rows) || state.selectedRowIndex == null) {
            return null;
          }
          return log.rows[state.selectedRowIndex] || null;
        }

        function selectedOrFirstError() {
          return selectedRow() || (state.logs.csv && state.logs.csv.rows || []).find((row) => row.severity === "ERROR") || null;
        }

        async function explainSelected() {
          const row = selectedOrFirstError();
          if (!row) {
            await copyText(currentLogText());
            elements.statusNote.textContent = "Kein einzelner Fehler ausgewählt. Log wurde kopiert.";
            return;
          }
          const text = "Bitte erkläre diesen ilivalidator-Fehler aus Job " + state.jobId + ":\\n" + row.message;
          await sendChatMessageOrCopy(text);
        }

        async function lookupModel() {
          const row = selectedOrFirstError();
          const query = extractSearchTerm(row ? row.message : currentLogText());
          const text = "Suche im Modelfinder nach: " + query;
          await sendChatMessageOrCopy(text);
        }

        async function sendChatMessageOrCopy(text) {
          try {
            await request("ui/message", { role: "user", content: [{ type: "text", text }] }, 5000);
            elements.statusNote.textContent = "Anfrage an den Chat gesendet.";
          } catch {
            await copyText(text);
            elements.statusNote.textContent = "Host unterstützt keine Chat-Nachricht. Text wurde kopiert.";
          }
        }

        function currentLogText() {
          const log = state.logs[state.activeLog];
          return log ? log.content || JSON.stringify(log.rows || [], null, 2) : "";
        }

        function extractSearchTerm(text) {
          const match = String(text || "").match(/[A-Z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+){0,3}/);
          return match ? match[0] : String(text || "").split(/\s+/).slice(0, 4).join(" ");
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

        function extractError(result) {
          return result && result.structuredContent && result.structuredContent.message ? result.structuredContent.message : "Tool-Aufruf fehlgeschlagen.";
        }

        function badgeClass(status, validationResult) {
          const combined = String(status || "") + " " + String(validationResult || "");
          if (/FAIL|ERROR|FAILED/i.test(combined)) return "danger";
          if (/PROCESSING|ENQUEUED/i.test(combined)) return "warning";
          if (/SUCCEEDED|SUCCESS/i.test(combined)) return "success";
          return "";
        }

        function shorten(value) {
          return value.length > 18 ? value.slice(0, 8) + "..." + value.slice(-6) : value;
        }

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        }

        function sendSize() {
          const root = elements.appRoot;
          if (!(root instanceof HTMLElement)) return;

          const width = Math.ceil(root.scrollWidth || root.getBoundingClientRect().width || window.innerWidth);
          const measuredHeight = Math.ceil(root.scrollHeight || root.getBoundingClientRect().height || 0);
          const height = Math.min(MAX_EMBED_HEIGHT_PX, measuredHeight);

          if (width === sizeState.width && height === sizeState.height) {
            return;
          }

          sizeState.width = width;
          sizeState.height = height;
          notify("ui/notifications/size-changed", { width, height });
        }

        function scheduleSizeUpdate() {
          if (sizeFrame !== null) {
            return;
          }

          sizeFrame = window.requestAnimationFrame(() => {
            sizeFrame = null;
            sendSize();
          });
        }

        function handleRequest(message) {
          if (message.method === "ui/resource-teardown") {
            window.clearTimeout(state.refreshTimer);
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

        elements.refreshButton.addEventListener("click", refreshJob);
        elements.copyJobButton.addEventListener("click", async () => {
          if (state.jobId) await copyText(state.jobId);
        });
        elements.tabCsv.addEventListener("click", () => loadLog("csv"));
        elements.tabText.addEventListener("click", () => loadLog("text"));
        elements.tabXtf.addEventListener("click", () => loadLog("xtf"));
        elements.copyLogButton.addEventListener("click", async () => copyText(currentLogText()));
        elements.filterAll.addEventListener("click", () => { state.filter = "all"; renderLog(); });
        elements.filterErrors.addEventListener("click", () => { state.filter = "errors"; renderLog(); });
        elements.filterWarnings.addEventListener("click", () => { state.filter = "warnings"; renderLog(); });
        elements.searchInput.addEventListener("input", renderLog);
        elements.explainButton.addEventListener("click", explainSelected);
        elements.modelButton.addEventListener("click", lookupModel);

        if ("ResizeObserver" in window) {
          const resizeObserver = new ResizeObserver(scheduleSizeUpdate);
          if (elements.appRoot instanceof HTMLElement) {
            resizeObserver.observe(elements.appRoot);
          }
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
            renderShell();
            if (state.jobId) refreshJob();
          })
          .catch(() => {
            elements.statusNote.textContent = "Host-Initialisierung nicht bestätigt.";
          });
      })();
    </script>
  </body>
</html>`;
}
