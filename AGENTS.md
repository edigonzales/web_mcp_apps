# AGENTS.md

Diese Datei gilt fuer alle Projekte unter `/Users/stefan/sources/web_mcp_apps`, solange in einem Unterverzeichnis keine spezifischere `AGENTS.md` liegt.

## Geltungsbereich und Repo-Form

- Dieses Repository ist kein einzelnes npm-Workspace-Projekt. Es ist eine Sammlung mehrerer lokaler MCP-Projekte.
- Fuehre Build-, Test- und Inspect-Befehle immer im jeweiligen Projektverzeichnis aus, nicht im Repo-Root.
- Nutze `npm`, weil die Projekte `package-lock.json` verwenden. Fuehre nicht ohne ausdruecklichen Auftrag `pnpm`, `yarn` oder `bun` ein.
- `node_modules/`, `dist/`, Coverage, Caches, Logs, lokale `.env`-Dateien und Host-spezifische Konfigurationen sind keine Quellartefakte.
- Bearbeite grundsaetzlich die TypeScript-Quellen unter `src/` und die Tests unter `test/`. Aendere generiertes `dist/` nicht manuell.
- Es gibt derzeit diese Projektbereiche:
  - `mcp_apps/`: lokaler MCP-Apps-Server fuer den OEREB-Kataster SO.
  - `sogis-interlis-mcp/`: MCP-Server und MCP-Apps fuer SOGIS ilivalidator und Modelfinder.
  - `webmcp/`: aktuell leer. Dort nichts erfinden, scaffolden oder dokumentieren, solange keine konkrete Anforderung dafuer vorliegt.

## Allgemeine Arbeitsregeln

- Lies zuerst die vorhandenen READMEs, `package.json`, `tsconfig.json`, relevante Tests und die betroffenen `src/`-Dateien.
- Respektiere vorhandene Aenderungen im Arbeitsbaum. Rueckgaengig machen, loeschen oder aufraeumen nur, wenn der Auftrag das klar verlangt.
- Halte Aenderungen eng am Auftrag. Keine allgemeinen Refactors, Umbenennungen, Formatierungslaeufe oder Architekturwechsel ohne sachlichen Grund.
- Aendere keine lokalen Host-Konfigurationen fuer Claude Desktop, Goose, Inspector oder andere MCP-Hosts, ausser der Auftrag fordert das explizit.
- Desktop-Hosts sollen auf gebaute `dist/index.js`-Dateien zeigen. Dokumentiere das so, aber editiere Host-Konfigurationen nicht ungefragt.
- Externe SO-Dienste gelten als veraenderliche Open-World-Abhaengigkeiten. Unit-Tests muessen sie mocken.
- Live-Smoke-Tests gegen `geo.so.ch` sind optional und bewusst auszufuehren. Sie duerfen nicht zur Voraussetzung fuer `npm test` werden.
- Wenn du neue oeffentliche Tool-Eingaben, Tool-Ausgaben, Resource-URIs, UI-Metadaten oder Env-Variablen einfuehrst, aktualisiere README, Tests und diese Datei bei Bedarf.

## Gemeinsame TypeScript- und Node-Konventionen

- Beide Projekte sind ESM-Projekte (`"type": "module"`) mit TypeScript, `strict: true`, `module: "NodeNext"` und `moduleResolution: "NodeNext"`.
- Lokale Imports in TypeScript-Quellen verwenden die spaeteren JavaScript-Endungen, zum Beispiel `./server.js`, auch wenn die Quelldatei `server.ts` heisst.
- Verwende die bestehenden Zod-Schemas aus `zod/v4` fuer Tool-Eingaben und strukturierte Ausgaben.
- Halte Tool-Registrierung, HTTP-Clients, Normalisierung und reine Validierungslogik getrennt. Bestehendes Muster:
  - Server-Erzeugung registriert Tools und Resources.
  - Services oder Resolver kapseln externe HTTP-Aufrufe.
  - Tests injizieren `fetch`-Mocks oder In-Memory-Transports.
- Nutze `URL` und `URLSearchParams` fuer URLs. Keine manuelle Query-String-Verkettung.
- Stdio-MCP-Server duerfen stdout nicht fuer Debug-Ausgaben verwenden, weil stdout Teil des MCP-Transports ist. Falls Debug-Ausgaben noetig sind, nur bewusst und vorzugsweise ueber stderr.
- Behandle Tool-Resultate als oeffentliche Schnittstelle. `content`, `structuredContent`, `isError` und `_meta` duerfen nicht unbedacht umgeformt werden.
- Fuer MCP Apps muessen Resource-MIME-Type und UI-Metadaten konsistent bleiben:
  - MIME-Type: `text/html;profile=mcp-app`
  - UI-Resource-Referenzen in Tool-Metadaten
  - Explizite CSP-Domains fuer Frames, Connections, Resources und Base-URIs
- Halte deutsche Tool-Titel, Beschreibungen und Benutzertexte konsistent mit den vorhandenen Projekten.
- Fuer neue Dateien ist ASCII bevorzugt. Deutsche Dokumentation und vorhandene fachliche Begriffe duerfen Umlaute verwenden, wenn das die Lesbarkeit verbessert.

## Standardbefehle

### Root

Im Repo-Root gibt es keinen gemeinsamen Build- oder Testbefehl.

```bash
cd /Users/stefan/sources/web_mcp_apps
git status --short
```

### `mcp_apps/`

Voraussetzung laut `package.json`: Node.js `>=22`.

```bash
cd /Users/stefan/sources/web_mcp_apps/mcp_apps
npm install
npm run typecheck
npm run build
npm test
npm run inspect
node dist/index.js --stdio
```

Hinweise:

- `npm run build` schreibt nach `dist/`.
- `npm run inspect` startet den MCP Inspector mit `node dist/index.js --stdio`.
- Ohne Argumente startet der gebaute Server ebenfalls im stdio-Modus.

### `sogis-interlis-mcp/`

Voraussetzung laut `package.json`: Node.js `>=20`. Wenn beide Projekte betroffen sind, verwende Node.js 22 oder neuer.

```bash
cd /Users/stefan/sources/web_mcp_apps/sogis-interlis-mcp
npm install
npm run build
npm test
npm run inspect
npm start -- --stdio
```

Hinweise:

- `npm run build` schreibt nach `dist/`.
- `npm test` nutzt den Node-Test-Runner mit `tsx`.
- `npm run inspect` startet den MCP Inspector mit `node dist/index.js --stdio`.
- `npm start -- --stdio` startet den gebauten Server per stdio.

## Projekt `mcp_apps/`

### Zweck

`mcp_apps` stellt einen lokalen MCP-Server und eine MCP App bereit, die den OEREB-Kataster des Kantons Solothurn fuer ein EGRID im Web-GIS-Client oeffnet. Das Projekt kann ein EGRID direkt verwenden oder ueber Gemeinde plus Grundbuch- beziehungsweise Grundstuecknummer aufloesen.

### Wichtige Dateien

- `src/index.ts`: CLI-Einstieg.
- `src/server.ts`: Server-Erzeugung und stdio-Start.
- `src/oerebTool.ts`: Tool `show_oereb_cadastre` und Resource-Registrierung.
- `src/appHtml.ts`: HTML, CSS und MCP-App-Bridge fuer die OEREB-App.
- `src/egrid.ts`: EGRID-Validierung und OEREB-URL-Erzeugung.
- `src/geoResolver.ts`: SO-GDI-Suche, Dataservice-Zugriff, Matching und Resolver-Typen.
- `src/geoTools.ts`: Tools `resolve_feature` und `resolve_parcel_egrid`.
- `src/constants.ts`: gemeinsame Konstanten, URLs, Resource-URI und Version.
- `test/`: Vitest-Tests fuer EGRID, Resolver, Tool-Resultate, App-HTML und MCP-Integration.

### Tools und Resource

- `resolve_feature`
  - Generischer Resolver nach dem GDI-MCP-Tools-Blueprint.
  - V1 unterstuetzt nur `target_types` mit `parcel`.
  - Erwartet fuer Grundstuecke `identifiers.parcel_no` und `identifiers.municipality`.
  - Liefert `status` als `resolved`, `needs_disambiguation` oder `not_found`.
- `resolve_parcel_egrid`
  - Alias fuer Demo- und Direktanfragen.
  - Erwartet `parcel_no` und `municipality`.
  - Liefert bei eindeutigem Treffer zusaetzlich `egrid`.
- `show_oereb_cadastre`
  - App-Tool fuer den OEREB-Web-GIS-Client.
  - Erwartet ein EGRID exakt im Format `CH` plus 12 Ziffern, zum Beispiel `CH807306583219`.
  - Akzeptiert keine kleingeschriebenen, getrimmten oder anderweitig normalisierten EGRID-Varianten.
- App-Resource:
  - `ui://oereb-cadastre/view`
  - Rendert den Web-GIS-Client in einem iframe und zeigt immer einen Direktlink auf `geo.so.ch`.

### Externe Dienste

Der Resolver nutzt oeffentliche Dienste der SO-GDI:

- Suchservice: `https://geo.so.ch/api/search/v2/`
- Dataservice: `https://geo.so.ch/api/data/v1/`
- Dataset: `ch.so.agi.av.grundstuecke.rechtskraeftig`
- OEREB-Ziel: `https://geo.so.ch/map/?oereb_egrid=<EGRID>`

Der Suchservice liefert Kandidaten. Der Dataservice liefert offizielle Attribute wie `nummer`, `gemeinde`, `nbident`, `bfs_nr`, `flaechenmass` und `egrid`. Das Matching darf tolerant gegen Gemeinde-Schreibvarianten sein, aber die Ausgabe soll offizielle Schreibweisen aus dem Dienst beibehalten.

### Entwicklungsregeln fuer `mcp_apps`

- Halte EGRID-Validierung streng. Keine automatische Grossschreibung, kein Trimmen im Tool-Vertrag, keine stillschweigende Korrektur.
- Wenn du den Resolver erweiterst, erhalte die bestehenden Statuswerte und das aktuelle Verhalten fuer Mehrdeutigkeit: nicht raten, sondern Kandidaten zurueckgeben.
- Wenn `include_geometry` false ist, sollen unnoetige Geometriedaten weiterhin nicht geladen oder ausgegeben werden.
- Fuer neue Zieltypen wie Gebaeude, Gemeinden, Adressen oder Koordinaten die bestehende Trennung aus Resolver, Tool-Schema und Tests beibehalten.
- Aendere Resource-URI, Tool-Namen oder `_meta.ui.resourceUri` nur bei ausdruecklicher API-Aenderung und mit passenden Tests.
- Bei Aenderungen an `appHtml.ts` pruefe weiterhin iframe, Direktlink und MCP-App-Bridge-Nachrichten.

### Tests fuer `mcp_apps`

- Nutze `npm test` fuer Vitest.
- Nutze `npm run typecheck` und `npm run build`, wenn TypeScript-Quellen betroffen sind.
- Mocke SO-Suchservice und SO-Dataservice in Unit-Tests.
- Ergaenze Tests fuer:
  - gueltige und ungueltige EGRID-Werte,
  - URL-Erzeugung,
  - Tool-Resultate mit `content`, `structuredContent` und `_meta`,
  - eindeutige Treffer, Mehrdeutigkeit, keine Treffer und Dienstfehler,
  - App-HTML, CSP und MCP-Integration mit In-Memory-Transport.

## Projekt `sogis-interlis-mcp/`

### Zweck

`sogis-interlis-mcp` ist eine Adapter- und UI-Schicht fuer SOGIS INTERLIS-Dienste. Es implementiert keine eigene INTERLIS-Validierung und keinen eigenen Modellindex, sondern kapselt:

- `https://geo.so.ch/ilivalidator`
- `https://geo.so.ch/modelfinder`

### Wichtige Dateien

- `src/index.ts`: CLI-Einstieg.
- `src/mcp/server.ts`: Server-Erzeugung, Client-Initialisierung und stdio-Start.
- `src/mcp/tools.ts`: Registrierung der ilivalidator- und Modelfinder-Tools.
- `src/mcp/resources.ts`: Registrierung der MCP-App-Resources und CSP.
- `src/config.ts`: Env-Konfiguration und Defaults.
- `src/constants.ts`: Serverdaten, Resource-URIs, Defaults und Titel.
- `src/services/ilivalidatorClient.ts`: HTTP-Client, Job-Start, Job-Status, Logs und Normalisierung.
- `src/services/modelfinderClient.ts`: Modelfinder-Suche, Link-Berechnung und Kontext-Normalisierung.
- `src/types/`: Typen fuer ilivalidator und Modelfinder.
- `src/util/`: Fehler-, URL- und Log-Parsing-Helfer.
- `src/ui/`: HTML fuer Job-Viewer und Model-Viewer.
- `test/`: Node-Test-Runner-Tests fuer MCP-Server, Modelfinder, Normalisierung und Log-Parsing.

### Konfiguration

Unterstuetzte Env-Variablen:

- `SOGIS_ILIVALIDATOR_BASE_URL`
  - Default: `https://geo.so.ch/ilivalidator`
- `SOGIS_MODELFINDER_BASE_URL`
  - Default: `https://geo.so.ch/modelfinder`
- `SOGIS_HTTP_TIMEOUT_MS`
  - Default: `30000`
- `SOGIS_MAX_LOG_BYTES`
  - Default: `2000000`
- `SOGIS_ALLOWED_ORIGINS`
  - Default: leer
- `SOGIS_ALLOWED_FILE_REF_ORIGINS`
  - Default: leer
- `SOGIS_SAMPLE_XTF_PATH`
  - Default: `/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf`

Die Sample-XTF-Datei ist ein lokaler Smoke-Test-Hinweis und darf nicht ins Repo kopiert oder in Unit-Tests vorausgesetzt werden.

### Tools und Resources

Tools:

- `list_validation_profiles`
- `validate_interlis_transfer`
- `get_validation_job`
- `get_validation_log`
- `summarize_validation_result`
- `search_interlis_models`
- `build_modelfinder_url`
- `get_modelfinder_context`

MCP-App-Resources:

- `ui://ilivalidator/job-viewer`
- `ui://modelfinder/model-viewer`

`validate_interlis_transfer` verwendet bevorzugt `fileRefs` fuer absolute lokale Pfade, `file://` URLs oder erlaubte `https://` URLs. Base64-Dateiinhalte ueber `files[].dataBase64` bleiben als Fallback erhalten. Bei HTTP-Transporten sind lokale Pfade serverseitige Pfade; Client-Dateien muessen als serverseitig erreichbare HTTPS-URL bereitgestellt werden.

Der Job-Viewer nutzt die MCP-App-Bridge fuer Tool-Aufrufe wie `get_validation_job` und `get_validation_log`. Wenn ein Host Tool-Aufrufe aus Apps nicht proxyt, muessen Text-, Link- und Copy-Fallbacks weiterhin sinnvoll bleiben.

Der Modelfinder verwendet eine eigene Trefferliste und Detailansicht auf Basis der JSON-Suchantworten des externen Dienstes. Die UML-Vorschau bleibt eine externe Einbettung; bei Host-CSP oder Frame-Policy-Problemen muessen Direktlinks erhalten bleiben.

### Entwicklungsregeln fuer `sogis-interlis-mcp`

- Behandle den ilivalidator als externe Quelle der Wahrheit. Keine eigene INTERLIS-Validierungslogik erfinden.
- Behandle den Modelfinder als externe Quelle der Wahrheit fuer Suche, Metadaten und UML-Ziele. Keine lokale Modellindexierung oder eigene UML-Ableitung einfuehren.
- Halte HTTP-Timeouts, maximale Log-Groessen und URL-Normalisierung defensiv.
- Beim Lesen von Logs `SOGIS_MAX_LOG_BYTES` respektieren und Truncation sichtbar machen.
- Fehler sollen als klare Tool-Fehler mit strukturierten Details zurueckkommen, nicht als unklare Exceptions fuer den Host.
- Aendere Resource-URIs, Tool-Namen, Tool-Schemas oder `_meta.ui.resourceUri` nur mit passenden Tests.
- Wenn CSP-Domains aus Konfiguration abgeleitet werden, die Herleitung mit `originFromUrl` oder bestehendem URL-Helfer beibehalten.
- Clipboard-Berechtigungen in UI-Metadaten nur dort setzen, wo die App sie wirklich braucht.

### Tests fuer `sogis-interlis-mcp`

- Nutze `npm test` fuer den Node-Test-Runner mit `tsx`.
- Nutze `npm run build`, wenn TypeScript-Quellen betroffen sind.
- Mocke ilivalidator- und Modelfinder-Antworten in Tests.
- Ergaenze Tests fuer:
  - Tool-Registrierung und UI-Metadaten,
  - Resource-MIME-Type und CSP,
  - Profil-Normalisierung,
  - Job-ID-Extraktion aus `operation-location` und JSON-Fallbacks,
  - Job-Status, Retry-After und Log-URL-Normalisierung,
  - CSV- und Text-Log-Zusammenfassungen,
  - Modelfinder-JSON-Suche, lokale `ilisite`-Filterung, Link-Berechnung und App-Kontext.

## MCP-App- und Host-Kompatibilitaet

- Ein MCP-Host startet diese Server lokal ueber stdio. Das ist der primaere Transport.
- Tool- und Resource-Registrierungen muessen mit dem Model Context Protocol SDK und `@modelcontextprotocol/ext-apps` kompatibel bleiben.
- App-HTML wird als Resource ausgeliefert, nicht als separate statische Datei.
- Die App kommuniziert mit dem Host per `postMessage` und JSON-RPC-Meldungen. Bestehende Bridge-Nachrichten nicht ohne Testabdeckung umbenennen.
- Achte bei App-HTML auf robuste Fallbacks:
  - sichtbarer Direktlink fuer externe iframes,
  - sinnvolle Fehlermeldungen bei fehlendem Tool-Resultat,
  - keine harte Abhaengigkeit von Live-Netzwerk in Unit-Tests.
- CSP-Aenderungen sind sicherheitsrelevant. Erweitere Domains nur minimal und projektspezifisch.

## Test- und Verifikationspolitik

- Fuer reine Dokumentationsaenderungen reicht normalerweise:

```bash
git diff -- AGENTS.md
```

- Fuer Codeaenderungen in `mcp_apps/` mindestens:

```bash
cd /Users/stefan/sources/web_mcp_apps/mcp_apps
npm run typecheck
npm run build
npm test
```

- Fuer Codeaenderungen in `sogis-interlis-mcp/` mindestens:

```bash
cd /Users/stefan/sources/web_mcp_apps/sogis-interlis-mcp
npm run build
npm test
```

- Wenn beide Projekte betroffen sind, fuehre die Verifikation in beiden Projektordnern aus.
- Wenn ein Test bewusst nicht ausgefuehrt wird, dokumentiere im Abschluss kurz den Grund.
- Wenn Live-Smoke-Tests ausgefuehrt werden, trenne sie klar von Unit-Tests und dokumentiere Datum, Ziel-URL und beobachtetes Resultat.
- Vor Abschluss immer `git status --short` pruefen und nur die beabsichtigten Aenderungen zusammenfassen.

## Schnittstellenstabilitaet

- Tool-Namen, Resource-URIs, strukturierte Ausgaben und Env-Variablen sind oeffentliche Schnittstellen fuer Hosts und Agenten.
- Aendere oeffentliche Schnittstellen nur, wenn der Auftrag das verlangt oder ein Bugfix es zwingend macht.
- Bei Schnittstellenaenderungen:
  - Tests aktualisieren,
  - README aktualisieren,
  - Beispielpayloads aktualisieren,
  - Rueckwaertskompatibilitaet oder Breaking Change klar dokumentieren.
- Bei neuen Tools immer sinnvolle MCP-Annotationen setzen:
  - `readOnlyHint`
  - `destructiveHint`
  - `idempotentHint`
  - `openWorldHint`
- Fuer App-Tools die Verbindung zwischen Tool und UI-Resource ueber `_meta.ui.resourceUri` testen.

## Abschlusscheck fuer Agenten

Vor einer finalen Antwort:

- Pruefe, ob nur die beauftragten Dateien geaendert wurden.
- Pruefe, ob generierte Artefakte wie `dist/` ignoriert bleiben.
- Pruefe, ob neue oder geaenderte Commands wirklich im jeweiligen Projekt funktionieren oder klar als nicht ausgefuehrt markiert sind.
- Nenne die relevanten Tests und Builds mit Ergebnis.
- Nenne bekannte Restrisiken, zum Beispiel nicht ausgefuehrte Live-Smoke-Tests oder externe Dienstabhaengigkeiten.
