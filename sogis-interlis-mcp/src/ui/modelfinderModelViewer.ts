import {
  MCP_APPS_PROTOCOL_VERSION,
  MODELFINDER_MODEL_VIEWER_TITLE,
  SERVER_VERSION
} from "../constants.js";
import { ensureTrailingSlash, joinUrl } from "../util/urls.js";

export function createModelfinderModelViewerHtml(baseUrl: string): string {
  const normalizedBaseUrl = ensureTrailingSlash(baseUrl);
  const searchBaseUrl = joinUrl(normalizedBaseUrl, "/models");

  return String.raw`<!doctype html>
<html lang="de-CH">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${MODELFINDER_MODEL_VIEWER_TITLE}</title>
    <style>
      :root {
        color-scheme: light dark;
        --background: linear-gradient(180deg, #f2f4ef 0%, #e7ece3 100%);
        --surface: rgba(255, 255, 255, 0.88);
        --surface-strong: rgba(255, 255, 255, 0.96);
        --surface-muted: rgba(240, 242, 236, 0.92);
        --surface-selected: #dcefe9;
        --text: #172026;
        --muted: #54606a;
        --border: rgba(26, 37, 43, 0.12);
        --accent: #12624f;
        --accent-soft: rgba(18, 98, 79, 0.12);
        --shadow: 0 16px 40px rgba(23, 32, 38, 0.08);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --background: linear-gradient(180deg, #101413 0%, #171d1a 100%);
          --surface: rgba(32, 37, 34, 0.9);
          --surface-strong: rgba(37, 42, 39, 0.96);
          --surface-muted: rgba(27, 31, 29, 0.96);
          --surface-selected: rgba(100, 199, 168, 0.14);
          --text: #ecf0eb;
          --muted: #a9b4ad;
          --border: rgba(236, 240, 235, 0.1);
          --accent: #64c7a8;
          --accent-soft: rgba(100, 199, 168, 0.18);
          --shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
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
        font-family: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", sans-serif;
      }

      button,
      a,
      input,
      summary {
        font: inherit;
      }

      .shell {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        max-height: 960px;
        overflow: hidden;
      }

      header,
      .toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
      }

      header {
        border-bottom: 1px solid var(--border);
      }

      .title-wrap {
        min-width: 0;
      }

      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }

      .meta {
        max-width: 440px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.45;
        text-align: right;
      }

      .toolbar {
        border-bottom: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.24);
        backdrop-filter: blur(12px);
      }

      .url-block {
        min-width: 0;
        flex: 1 1 auto;
      }

      .toolbar-label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .url {
        color: var(--muted);
        font: 12px "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
        overflow-wrap: anywhere;
      }

      .toolbar-actions,
      .panel-actions,
      .model-actions,
      .tabs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      button,
      a.action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 7px 12px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text);
        text-decoration: none;
        cursor: pointer;
        transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
      }

      button:hover,
      a.action:hover,
      summary:hover {
        background: var(--surface-muted);
      }

      button.primary,
      a.primary {
        border-color: transparent;
        background: var(--accent);
        color: white;
      }

      button.secondary,
      a.secondary {
        background: var(--accent-soft);
        color: var(--accent);
        border-color: rgba(18, 98, 79, 0.16);
      }

      button.tab {
        min-height: 34px;
        padding: 6px 11px;
        background: transparent;
      }

      button.tab.active {
        background: var(--accent-soft);
        color: var(--accent);
        border-color: rgba(18, 98, 79, 0.18);
      }

      main {
        padding: 18px 20px 20px;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(300px, 34%) minmax(0, 1fr);
        gap: 18px;
        min-height: 0;
      }

      .sidebar,
      .panel {
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: 22px;
        background: var(--surface);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .sidebar {
        display: grid;
        grid-template-rows: auto 1fr;
      }

      .section-head,
      .panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 18px 14px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-strong);
      }

      .section-head h2,
      .panel-head h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
      }

      .count-pill,
      .tag {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        background: var(--surface-muted);
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .sidebar-body {
        padding: 12px;
        overflow: auto;
      }

      details.repo-group {
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface-strong);
        margin-bottom: 12px;
        overflow: hidden;
      }

      summary.repo-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 13px 14px;
        cursor: pointer;
      }

      summary.repo-summary::-webkit-details-marker {
        display: none;
      }

      .repo-label {
        min-width: 0;
      }

      .repo-name {
        font-size: 14px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .repo-hint {
        color: var(--muted);
        font-size: 12px;
      }

      .group-models {
        padding: 0 12px 12px;
      }

      .model-card {
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--surface);
        padding: 12px;
      }

      .model-card + .model-card {
        margin-top: 10px;
      }

      .model-card.selected {
        border-color: rgba(18, 98, 79, 0.28);
        background: var(--surface-selected);
      }

      .model-select {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: inherit;
        text-align: left;
      }

      .model-select:hover {
        background: transparent;
      }

      .model-title {
        margin: 0 0 6px;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .model-subline,
      .empty,
      .panel-meta,
      .note {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }

      .model-actions {
        margin-top: 10px;
      }

      .model-actions button,
      .model-actions a.action {
        min-height: 31px;
        padding: 5px 10px;
        border-radius: 10px;
        font-size: 12px;
      }

      .panel {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .panel-copy {
        min-width: 0;
      }

      .panel-meta {
        margin-top: 6px;
        overflow-wrap: anywhere;
      }

      .tabs {
        padding: 14px 18px 0;
      }

      .panel-body {
        padding: 16px 18px 18px;
        overflow: auto;
      }

      .details-grid {
        display: grid;
        gap: 12px;
      }

      .detail-card {
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface-strong);
        padding: 14px;
      }

      .detail-card h3 {
        margin: 0 0 10px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .facts {
        display: grid;
        grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
        gap: 10px 14px;
      }

      .facts dt {
        color: var(--muted);
        font-size: 13px;
      }

      .facts dd {
        margin: 0;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .facts a {
        color: var(--accent);
        text-decoration: none;
      }

      .uml-frame {
        width: 100%;
        height: 620px;
        max-height: 620px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface-muted);
      }

      .hidden {
        display: none !important;
      }

      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }

        .meta {
          text-align: left;
        }
      }

      @media (max-width: 720px) {
        header,
        .toolbar,
        .section-head,
        .panel-head {
          flex-direction: column;
        }

        .toolbar-actions,
        .panel-actions {
          width: 100%;
        }

        .toolbar-actions > *,
        .panel-actions > * {
          flex: 1 1 auto;
        }

        .facts {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
    </style>
  </head>
  <body>
    <div id="appRoot" class="shell">
      <header>
        <div class="title-wrap">
          <h1>${MODELFINDER_MODEL_VIEWER_TITLE}</h1>
        </div>
        <div id="meta" class="meta">Warte auf Suchkontext...</div>
      </header>

      <div class="toolbar">
        <div class="url-block">
          <span class="toolbar-label">Fallback-Link zur Rohsuche</span>
          <div id="urlText" class="url">${escapeForHtml(searchBaseUrl)}</div>
        </div>
        <div class="toolbar-actions">
          <a id="openLink" class="action secondary" href="${escapeForHtml(searchBaseUrl)}" target="_blank" rel="noopener noreferrer">Suchseite öffnen</a>
          <button id="copyButton" type="button">Suchlink kopieren</button>
          <button id="explainButton" class="primary" type="button">Suche im Chat erklären</button>
        </div>
      </div>

      <main>
        <div class="layout">
          <aside class="sidebar">
            <div class="section-head">
              <div>
                <h2>Treffer</h2>
                <div class="panel-meta">Eigenes Demo-Listing statt eingebetteter Fremdsuche.</div>
              </div>
              <span id="countPill" class="count-pill">0 Modelle</span>
            </div>
            <div id="groups" class="sidebar-body">
              <div class="empty">Noch keine Suchresultate geladen.</div>
            </div>
          </aside>

          <section class="panel">
            <div class="panel-head">
              <div class="panel-copy">
                <h2 id="selectedTitle">Kein Modell ausgewählt</h2>
                <div id="selectedMeta" class="panel-meta">Sobald ein Tool einen Suchkontext liefert, erscheinen hier Details und UML.</div>
              </div>
              <div id="selectedActions" class="panel-actions"></div>
            </div>

            <div class="tabs">
              <button id="detailsTab" class="tab active" type="button">Details</button>
              <button id="umlTab" class="tab" type="button">UML</button>
            </div>

            <div class="panel-body">
              <div id="detailsPane">
                <div class="empty">Noch keine Modelldetails vorhanden.</div>
              </div>
              <div id="umlPane" class="hidden">
                <div class="empty">Noch keine UML-Vorschau vorhanden.</div>
              </div>
              <div id="note" class="note"></div>
            </div>
          </section>
        </div>
      </main>
    </div>

    <script>
      (() => {
        const appInfo = { name: "${MODELFINDER_MODEL_VIEWER_TITLE}", version: "${SERVER_VERSION}" };
        const protocolVersion = "${MCP_APPS_PROTOCOL_VERSION}";
        const searchBaseUrl = "${escapeForJs(searchBaseUrl)}";
        const MAX_EMBED_HEIGHT_PX = 960;
        let nextRequestId = 1;
        let sizeFrame = null;
        const pendingRequests = new Map();
        const state = {
          hostCapabilities: {},
          query: null,
          ilisite: null,
          expanded: true,
          url: searchBaseUrl,
          groups: [],
          totalModelCount: 0,
          selectedKey: null,
          activeTab: "details"
        };

        const elements = {
          appRoot: document.getElementById("appRoot"),
          meta: document.getElementById("meta"),
          urlText: document.getElementById("urlText"),
          openLink: document.getElementById("openLink"),
          copyButton: document.getElementById("copyButton"),
          explainButton: document.getElementById("explainButton"),
          countPill: document.getElementById("countPill"),
          groups: document.getElementById("groups"),
          selectedTitle: document.getElementById("selectedTitle"),
          selectedMeta: document.getElementById("selectedMeta"),
          selectedActions: document.getElementById("selectedActions"),
          detailsTab: document.getElementById("detailsTab"),
          umlTab: document.getElementById("umlTab"),
          detailsPane: document.getElementById("detailsPane"),
          umlPane: document.getElementById("umlPane"),
          note: document.getElementById("note")
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
              if (!pendingRequests.has(id)) return;
              pendingRequests.delete(id);
              reject(new Error(method + " hat keine Antwort vom Host erhalten."));
            }, timeoutMs);
          });
        }

        function buildSearchUrl(query) {
          const url = new URL(searchBaseUrl);
          if (typeof query === "string" && query.trim() !== "") {
            url.searchParams.set("query", query.trim());
          }
          return url.toString();
        }

        function setStateFromCandidate(candidate) {
          if (!candidate || typeof candidate !== "object") return;
          if (typeof candidate.query === "string") state.query = candidate.query;
          if (typeof candidate.ilisite === "string") {
            state.ilisite = candidate.ilisite;
          } else if (candidate.ilisite === null) {
            state.ilisite = null;
          }
          if (typeof candidate.expanded === "boolean") state.expanded = candidate.expanded;
          if (typeof candidate.url === "string") {
            state.url = candidate.url;
          } else {
            state.url = buildSearchUrl(state.query);
          }
          if (Array.isArray(candidate.groups)) {
            state.groups = candidate.groups;
          }
          if (typeof candidate.totalModelCount === "number") {
            state.totalModelCount = candidate.totalModelCount;
          } else {
            state.totalModelCount = flattenModels().length;
          }

          const selected = candidate.selectedModel && typeof candidate.selectedModel === "object"
            ? candidate.selectedModel
            : null;
          if (selected) {
            state.selectedKey = modelKey(selected);
          }

          ensureSelectedModel();
        }

        function applyToolArguments(args) {
          if (!args || typeof args !== "object") return;
          if (typeof args.query === "string") state.query = args.query;
          if (typeof args.ilisite === "string") {
            state.ilisite = args.ilisite;
          } else if (args.ilisite === null) {
            state.ilisite = null;
          }
          if (typeof args.expanded === "boolean") state.expanded = args.expanded;
          state.url = buildSearchUrl(state.query);
          ensureSelectedModel();

          if (state.hostCapabilities.serverTools && state.query) {
            rebuildOrLoadContext();
            return;
          }

          render();
        }

        function applyToolResult(result) {
          const structured = result && result.structuredContent;
          const meta = result && result._meta && result._meta.modelfinder;
          const candidate = structured || meta;
          if (!candidate || typeof candidate !== "object") return;
          setStateFromCandidate(candidate);
          render();
        }

        async function rebuildOrLoadContext() {
          if (!state.query) {
            state.groups = [];
            state.totalModelCount = 0;
            state.selectedKey = null;
            render();
            return;
          }

          if (!state.hostCapabilities.serverTools) {
            render();
            return;
          }

          elements.note.textContent = "Lade Modelfinder-Kontext...";
          try {
            const result = await request("tools/call", {
              name: "get_modelfinder_context",
              arguments: {
                query: state.query,
                ...(state.ilisite ? { ilisite: state.ilisite } : {}),
                expanded: state.expanded
              }
            });

            if (result.isError) {
              elements.note.textContent = extractError(result);
              return;
            }

            state.groups = [];
            setStateFromCandidate(result.structuredContent);
            render();
          } catch (error) {
            elements.note.textContent = toText(error && error.message ? error.message : error);
            render();
          }
        }

        function flattenModels() {
          return state.groups.flatMap((group) => Array.isArray(group.models) ? group.models : []);
        }

        function modelKey(model) {
          if (model && typeof model.key === "string" && model.key !== "") {
            return model.key;
          }
          const serverUrl = toText(model && model.serverUrl);
          const file = toText(model && model.file);
          return serverUrl && file ? serverUrl + "|" + file : null;
        }

        function ensureSelectedModel() {
          const models = flattenModels();
          if (models.length === 0) {
            state.selectedKey = null;
            return null;
          }

          const selected = models.find((model) => modelKey(model) === state.selectedKey);
          if (selected) {
            return selected;
          }

          state.selectedKey = modelKey(models[0]);
          return models[0];
        }

        function selectedModel() {
          return ensureSelectedModel();
        }

        function render() {
          renderMeta();
          renderGroups();
          renderPanel();
          scheduleSizeUpdate();
        }

        function renderMeta() {
          if (!state.query) {
            elements.meta.textContent = "Die App zeigt Suchresultate, Details und UML zu einem vom Tool gelieferten INTERLIS-Suchbegriff.";
          } else if (state.totalModelCount === 0) {
            elements.meta.textContent = 'Keine Treffer fuer "' + state.query + '"' + (state.ilisite ? ' in ' + state.ilisite : '') + '.';
          } else {
            elements.meta.textContent =
              String(state.totalModelCount) + ' Treffer fuer "' + state.query + '"' +
              (state.ilisite ? ' in ' + state.ilisite : '') +
              ' in ' + String(state.groups.length) + ' Gruppen.';
          }

          elements.countPill.textContent = String(state.totalModelCount) + (state.totalModelCount === 1 ? " Modell" : " Modelle");
          elements.urlText.textContent = state.url;
          elements.openLink.href = state.url;
        }

        function renderGroups() {
          if (!state.query) {
            elements.groups.innerHTML = '<div class="empty">Die Trefferliste erscheint, sobald ein Tool eine Suche wie "Suche das INTERLIS-Modell abbaustellen" ausfuehrt.</div>';
            return;
          }

          if (!state.groups.length) {
            elements.groups.innerHTML = '<div class="empty">Keine Treffer fuer diesen Suchkontext.</div>';
            return;
          }

          const openAttr = state.expanded ? " open" : "";
          elements.groups.innerHTML = state.groups.map((group, groupIndex) => {
            const groupName = escapeHtml(toText(group.serverDisplayName) || ("Repository " + String(groupIndex + 1)));
            const models = Array.isArray(group.models) ? group.models : [];
            const modelCount = typeof group.modelCount === "number" ? group.modelCount : models.length;

            return '<details class="repo-group"' + openAttr + '>' +
              '<summary class="repo-summary">' +
                '<div class="repo-label">' +
                  '<div class="repo-name">' + groupName + '</div>' +
                  '<div class="repo-hint">Repository-Gruppe</div>' +
                '</div>' +
                '<span class="tag">' + escapeHtml(String(modelCount)) + '</span>' +
              '</summary>' +
              '<div class="group-models">' +
                models.map(renderModelCard).join("") +
              '</div>' +
            '</details>';
          }).join("");
        }

        function renderModelCard(model) {
          const key = modelKey(model);
          const selected = key !== null && key === state.selectedKey ? " selected" : "";
          const version = toNonEmptyText(model.version, "ohne Version");
          const schema = toNonEmptyText(model.schemaLanguage, "ILI unbekannt");
          const org = toText(model.organisationAbbreviation) || toText(model.organisationName) || "";

          return '<div class="model-card' + selected + '">' +
            '<button class="model-select" type="button" data-action="select" data-key="' + escapeHtml(String(key)) + '">' +
              '<div class="model-title">' + escapeHtml(toNonEmptyText(model.name, "Unbekanntes Modell")) + '</div>' +
              '<div class="model-subline">' + escapeHtml(version + ' · ILI ' + schema + (org ? ' · ' + org : '')) + '</div>' +
            '</button>' +
            '<div class="model-actions">' +
              '<button type="button" data-action="details" data-key="' + escapeHtml(String(key)) + '">Details</button>' +
              '<button type="button" data-action="uml" data-key="' + escapeHtml(String(key)) + '">UML</button>' +
              '<a class="action" href="' + escapeHtml(toText(model.fileUrl) || "#") + '" target="_blank" rel="noopener noreferrer">Datei oeffnen</a>' +
            '</div>' +
          '</div>';
        }

        function renderPanel() {
          const model = selectedModel();
          elements.detailsTab.classList.toggle("active", state.activeTab === "details");
          elements.umlTab.classList.toggle("active", state.activeTab === "uml");
          elements.detailsPane.classList.toggle("hidden", state.activeTab !== "details");
          elements.umlPane.classList.toggle("hidden", state.activeTab !== "uml");

          if (!model) {
            elements.selectedTitle.textContent = state.query ? "Keine Treffer gefunden" : "Kein Modell ausgewählt";
            elements.selectedMeta.textContent = state.query
              ? "Passe den Suchbegriff oder den Filter im Tool an, damit hier Details erscheinen."
              : "Sobald ein Suchkontext vorliegt, wird das erste Modell automatisch ausgewählt.";
            elements.selectedActions.innerHTML = "";
            elements.detailsPane.innerHTML = '<div class="empty">Noch keine Modelldetails vorhanden.</div>';
            elements.umlPane.innerHTML = '<div class="empty">Noch keine UML-Vorschau vorhanden.</div>';
            if (!state.hostCapabilities.serverTools && state.query && state.groups.length === 0) {
              elements.note.textContent = "Dieser Host hat der App keine Tool-Aufrufe geliefert. Nutze die Tool-Antwort im Chat oder oeffne die Rohsuche.";
            } else if (!elements.note.textContent) {
              elements.note.textContent = "";
            }
            return;
          }

          elements.selectedTitle.textContent = toNonEmptyText(model.name, "Unbekanntes Modell");
          elements.selectedMeta.textContent =
            toNonEmptyText(model.serverDisplayName, "Unbekanntes Repository") +
            ' · ' + toNonEmptyText(model.version, "ohne Version") +
            ' · ILI ' + toNonEmptyText(model.schemaLanguage, "unbekannt");

          elements.selectedActions.innerHTML =
            '<a class="action secondary" href="' + escapeHtml(toText(model.detailUrl) || "#") + '" target="_blank" rel="noopener noreferrer">Details extern</a>' +
            '<a class="action secondary" href="' + escapeHtml(toText(model.umlUrl) || "#") + '" target="_blank" rel="noopener noreferrer">UML extern</a>' +
            '<a class="action" href="' + escapeHtml(toText(model.fileUrl) || "#") + '" target="_blank" rel="noopener noreferrer">Datei oeffnen</a>';

          elements.detailsPane.innerHTML =
            '<div class="details-grid">' +
              '<div class="detail-card">' +
                '<h3>Zusammenfassung</h3>' +
                '<div class="panel-meta">' + escapeHtml(toNonEmptyText(model.displayName, toNonEmptyText(model.name, "Unbekanntes Modell"))) + '</div>' +
                (toText(model.shortDescription)
                  ? '<div class="panel-meta" style="margin-top:8px;">' + escapeHtml(String(model.shortDescription)) + '</div>'
                  : '<div class="panel-meta" style="margin-top:8px;">Keine Kurzbeschreibung im Suchresultat vorhanden.</div>') +
              '</div>' +
              '<div class="detail-card">' +
                '<h3>Metadaten</h3>' +
                '<dl class="facts">' +
                  factRow("Repository", linkedValue(model.serverDisplayName, model.serverUrl)) +
                  factRow("Datei", linkedValue(model.file, model.fileUrl)) +
                  factRow("Version", model.version) +
                  factRow("ILI-Version", model.schemaLanguage) +
                  factRow("Organisation", joinParts([model.organisationAbbreviation, model.organisationName], " · ")) +
                  factRow("Issuer", maybeLinkedValue(model.issuer)) +
                  factRow("Kontakt", maybeLinkedValue(model.technicalContact)) +
                  factRow("Weitere Infos", maybeLinkedValue(model.furtherInformation)) +
                  factRow("Vorgaenger", model.precursorVersion) +
                  factRow("Tags", model.tags) +
                  factRow("MD5", model.md5) +
                '</dl>' +
              '</div>' +
            '</div>';

          elements.umlPane.innerHTML =
            '<div class="detail-card">' +
              '<h3>Mermaid-UML</h3>' +
              '<iframe id="umlFrame" class="uml-frame" title="UML-Vorschau" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="' + escapeHtml(toText(model.umlUrl) || "") + '"></iframe>' +
              '<div class="note" style="margin-top:10px;">Falls die Einbettung blockiert wird, nutze den direkten UML-Link oben.</div>' +
            '</div>';

          if (state.activeTab === "uml") {
            elements.note.textContent = "Die UML-Vorschau nutzt die bestehende externe Modelfinder-Seite.";
          } else {
            elements.note.textContent = "Die Detailansicht stammt aus den JSON-Suchmetadaten des Modelfinders.";
          }
        }

        function factRow(label, valueHtml) {
          const content = valueHtml && String(valueHtml).trim() !== "" ? valueHtml : '<span class="panel-meta">-</span>';
          return '<dt>' + escapeHtml(label) + '</dt><dd>' + content + '</dd>';
        }

        function maybeLinkedValue(value) {
          const text = toText(value);
          if (!text) return "";
          if (/^(https?:|mailto:)/i.test(text)) {
            return linkedValue(text, text);
          }
          return escapeHtml(text);
        }

        function linkedValue(label, href) {
          const text = toText(label);
          const url = toText(href);
          if (!text) return "";
          if (!url) return escapeHtml(text);
          return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(text) + '</a>';
        }

        function joinParts(values, separator) {
          return values.map((value) => toText(value)).filter(Boolean).join(separator);
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
          const model = selectedModel();
          const text = model
            ? 'Bitte erkläre kurz diese INTERLIS-Modelfinder-Treffer fuer "' + state.query + '". Ausgewaehlt ist ' + toNonEmptyText(model.name, "das erste Modell") + ' (' + toNonEmptyText(model.version, "ohne Version") + '). Detail: ' + toText(model.detailUrl) + ' UML: ' + toText(model.umlUrl)
            : 'Bitte erkläre kurz den INTERLIS-Modelfinder-Kontext fuer diese Suche: ' + state.url;

          try {
            await request("ui/message", { role: "user", content: [{ type: "text", text }] }, 5000);
            elements.note.textContent = "Anfrage an den Chat gesendet.";
          } catch {
            await copyText(text);
            elements.note.textContent = "Host unterstuetzt keine Chat-Nachricht. Text wurde kopiert.";
          }
        }

        function extractError(result) {
          return result && result.structuredContent && result.structuredContent.message
            ? result.structuredContent.message
            : "Tool-Aufruf fehlgeschlagen.";
        }

        function toText(value) {
          return typeof value === "string" ? value : "";
        }

        function toNonEmptyText(value, fallback) {
          const text = toText(value).trim();
          return text === "" ? fallback : text;
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
            post({ jsonrpc: "2.0", id: message.id, result: {} });
          }
        }

        elements.copyButton.addEventListener("click", async () => {
          await copyText(state.url);
          elements.note.textContent = "Suchlink kopiert.";
        });

        elements.explainButton.addEventListener("click", explainSearch);
        elements.detailsTab.addEventListener("click", () => {
          state.activeTab = "details";
          renderPanel();
          scheduleSizeUpdate();
        });
        elements.umlTab.addEventListener("click", () => {
          state.activeTab = "uml";
          renderPanel();
          scheduleSizeUpdate();
        });

        elements.groups.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const actionEl = target.closest("[data-action]");
          if (!(actionEl instanceof HTMLElement)) return;
          const action = actionEl.getAttribute("data-action");
          const key = actionEl.getAttribute("data-key");
          if (!key) return;

          state.selectedKey = key;
          if (action === "uml") {
            state.activeTab = "uml";
          } else {
            state.activeTab = "details";
          }
          renderPanel();
          scheduleSizeUpdate();
        });

        if ("ResizeObserver" in window) {
          const resizeObserver = new ResizeObserver(scheduleSizeUpdate);
          if (elements.appRoot instanceof HTMLElement) {
            resizeObserver.observe(elements.appRoot);
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
            elements.note.textContent = "Host-Initialisierung nicht bestaetigt. Bereits gelieferte Tool-Daten bleiben nutzbar.";
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
