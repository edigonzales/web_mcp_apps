# MCP Apps Server für den ÖREB-Kataster SO

Dieses Projekt enthält einen lokalen MCP-Server, der Geo-Tools und eine MCP App für den Web-GIS-Client des Kantons Solothurn bereitstellt. Die App öffnet den ÖREB-Kataster für ein EGRID. Das EGRID kann entweder direkt geliefert oder über Gemeinde plus Grundbuch- beziehungsweise Grundstücknummer ermittelt werden.

Beispielanfrage im Host:

```text
Zeige mir den ÖREB-Kataster für das Grundstück CH807306583219
```

```text
Zeige mir den ÖREB-Kataster für Grundstück 1597 in Gunzgen
```

Der Server stellt dafür diese Tools bereit:

- `resolve_feature`: generischer Resolver nach dem `gdi-mcp-tools`-Blueprint. V1 unterstützt Grundstücke (`parcel`).
- `resolve_parcel_egrid`: Alias für Demo-Anfragen, der aus Gemeinde und Grundbuchnummer direkt den EGRID liefert.
- `show_oereb_cadastre`: MCP-App-Tool, das den ÖREB-Web-GIS-Client für ein EGRID öffnet.

## Was ist MCP?

MCP steht für Model Context Protocol. Ein Host wie Claude Desktop oder Goose startet oder verbindet einen MCP-Server und kann dessen Fähigkeiten nutzen. Der Host übernimmt die Unterhaltung mit dem Benutzer, das Modell entscheidet bei Bedarf, welches Tool sinnvoll ist, und der MCP-Server führt die konkrete Funktion aus.

Ein MCP-Server kann verschiedene Bausteine anbieten:

- Tools: ausführbare Funktionen mit klarer Eingabe und Ausgabe.
- Resources: Inhalte, die der Server unter einer URI bereitstellt.
- Prompts: wiederverwendbare Prompt-Vorlagen.

Dieses Projekt nutzt Tools und Resources.

## Was sind MCP Tools?

Ein Tool ist eine strukturierte Fähigkeit. Das App-Tool `show_oereb_cadastre` erwartet:

```json
{
  "egrid": "CH807306583219"
}
```

Das Tool validiert das EGRID, erzeugt die Ziel-URL und gibt Text, strukturierte Daten sowie UI-Metadaten zurück:

```json
{
  "egrid": "CH807306583219",
  "url": "https://geo.so.ch/map/?oereb_egrid=CH807306583219"
}
```

Die EGRID-Validierung ist absichtlich streng. Werte wie `ch807306583219`, zusätzliche Leerzeichen oder andere Präfixe werden abgelehnt.

Das generische Tool `resolve_feature` folgt dem Blueprint:

```json
{
  "target_types": ["parcel"],
  "identifiers": {
    "parcel_no": "1597",
    "municipality": "Gunzgen"
  },
  "include_geometry": false
}
```

Das Alias-Tool `resolve_parcel_egrid` ist für direkte Demo-Anfragen gedacht:

```json
{
  "parcel_no": "1597",
  "municipality": "Gunzgen"
}
```

Bei eindeutigem Treffer enthält die Antwort unter anderem:

```json
{
  "status": "resolved",
  "egrid": "CH293280730613",
  "features": [
    {
      "type": "parcel",
      "identifiers": {
        "egrid": "CH293280730613",
        "parcel_no": "1597",
        "municipality": "Gunzgen",
        "nbident": "SO0200002578"
      }
    }
  ]
}
```

Falls mehrere Grundstücke passen, wird kein Treffer geraten. Das Tool liefert `status: "needs_disambiguation"` mit Kandidaten zurück. Falls kein Grundstück passt, lautet der Status `not_found`.

## EGRID und Grundstücknummer

Das EGRID ist die eidgenössische Grundstückidentifikation und hat in diesem Projekt das Format `CH` plus 12 Ziffern. Eine Grundbuch- oder Grundstücknummer ist dagegen die lokal sprechende Nummer innerhalb einer Gemeinde oder eines Grundbuchs, zum Beispiel `1597` in `Gunzgen`.

Der Resolver nutzt die Grundbuchnummer nicht direkt als EGRID. Er sucht zuerst das Grundstück in der Geodateninfrastruktur des Kantons Solothurn und liest danach den offiziellen EGRID aus dem Grundstückdatensatz.

## Verwendete SO-Dienste

Für die Auflösung von Gemeinde plus Grundstücknummer nutzt der Server zwei öffentliche SO-GDI-Dienste:

1. Suchservice:

```text
https://geo.so.ch/api/search/v2/?searchtext=Grundstück%201597%20Gunzgen&filter=ch.so.agi.av.grundstuecke.rechtskraeftig
```

Der Suchservice liefert Kandidaten mit `feature_id`.

2. Dataservice:

```text
https://geo.so.ch/api/data/v1/ch.so.agi.av.grundstuecke.rechtskraeftig/<feature_id>?crs=EPSG:2056
```

Der Dataservice liefert die offiziellen Attribute wie `nummer`, `gemeinde`, `nbident`, `bfs_nr`, `flaechenmass` und `egrid`.

Der Resolver vergleicht Treffer lokal und tolerant gegen Schreibvarianten: Leerzeichen werden bereinigt, Gross-/Kleinschreibung wird ignoriert, und Umlaute werden für den Vergleich normalisiert. Die Ausgabe bleibt in der offiziellen Schreibung des Dienstes, zum Beispiel `Hägendorf`.

## Was sind MCP Resources?

Resources sind Inhalte, die der Server lesen lässt. Die App-HTML-Datei wird hier nicht als separate Datei ausgeliefert, sondern vom Server unter dieser Resource-URI bereitgestellt:

```text
ui://oereb-cadastre/view
```

Der Inhalt hat den MIME-Typ:

```text
text/html;profile=mcp-app
```

Damit erkennt ein Host, dass die Resource als MCP App gerendert werden kann.

## Was sind MCP Apps?

Eine MCP App verbindet ein Tool mit einer UI-Resource. Das Tool enthält in seinen Metadaten einen Verweis auf die UI:

```json
{
  "_meta": {
    "ui": {
      "resourceUri": "ui://oereb-cadastre/view"
    }
  }
}
```

Der Host ruft zuerst das Tool auf. Danach liest er die Resource `ui://oereb-cadastre/view` und rendert das HTML sandboxed in einem iframe. Die App und der Host kommunizieren über JSON-RPC-Nachrichten per `postMessage`, zum Beispiel:

- `ui/initialize`: App meldet sich beim Host.
- `ui/notifications/initialized`: App ist bereit.
- `ui/notifications/tool-input`: Host übergibt die Tool-Eingabe.
- `ui/notifications/tool-result`: Host übergibt das Tool-Ergebnis.
- `ui/notifications/size-changed`: App meldet ihre Grösse.

Der Datenfluss sieht so aus:

```text
Benutzeranfrage
  -> Host und Modell
  -> optional Tool resolve_parcel_egrid oder resolve_feature
  -> EGRID aus SO-Suchservice und SO-Dataservice
  -> Tool show_oereb_cadastre
  -> Tool-Ergebnis mit EGRID, Web-GIS-URL und ui:// Resource
  -> Host lädt ui://oereb-cadastre/view
  -> App rendert https://geo.so.ch/map/?oereb_egrid=<EGRID>
```

Die App rendert den Web-GIS-Client in einem iframe. Zusätzlich zeigt sie immer einen Direktlink auf `geo.so.ch`. Das ist wichtig, weil eine externe Website ihre iframe-Einbettung später per HTTP-Header einschränken kann.

## Installation

Voraussetzung ist Node.js 22 oder neuer.

```bash
cd mcp_apps
npm install
npm run build
npm test
```

## Lokaler Betrieb

Der Server nutzt standardmässig `stdio`. Das ist für lokale Desktop-Hosts der einfachste Transport: Der Host startet den Serverprozess und spricht über Standard-Ein- und -Ausgabe mit ihm.

```bash
cd mcp_apps
node dist/index.js --stdio
```

Ohne Argumente startet der Server ebenfalls im `stdio`-Modus:

```bash
node dist/index.js
```

## Claude Desktop

Nach dem Build kann Claude Desktop den Server lokal starten. Beispiel für die Konfiguration:

```json
{
  "mcpServers": {
    "oereb-mcp-apps": {
      "command": "node",
      "args": [
        "/Users/stefan/sources/web_mcp_apps/mcp_apps/dist/index.js",
        "--stdio"
      ]
    }
  }
}
```

Danach Claude Desktop neu starten. Die Beispielanfrage lautet:

```text
Zeige mir den ÖREB-Kataster für das Grundstück CH807306583219
```

Oder mit vorgängiger EGRID-Auflösung:

```text
Zeige mir den ÖREB-Kataster für Grundstück 1597 in Gunzgen
```

## Goose

Goose kann lokale MCP-Server ebenfalls über `stdio` einbinden. Eine typische Konfiguration verweist auf denselben Build:

```yaml
extensions:
  oereb-mcp-apps:
    command: node
    args:
      - /Users/stefan/sources/web_mcp_apps/mcp_apps/dist/index.js
      - --stdio
```

Je nach Goose-Version wird die Extension über die Desktop-Oberfläche oder über die lokale Konfigurationsdatei erfasst. Wichtig sind nur `command`, `args` und der fertig gebaute `dist/index.js`.

## MCP Inspector

Für eine schnelle Prüfung kann der MCP Inspector verwendet werden:

```bash
cd mcp_apps
npm run build
npm run inspect
```

Das Skript startet:

```bash
npx @modelcontextprotocol/inspector node dist/index.js --stdio
```

## Projektstruktur

```text
mcp_apps/
  src/
    appHtml.ts      # HTML, CSS und kleine App-Bridge
    constants.ts    # gemeinsame Konstanten
    egrid.ts        # Validierung und URL-Erzeugung
    geoResolver.ts  # SO-GDI-Suche, Dataservice-Zugriff und Matching
    geoTools.ts     # MCP-Tools resolve_feature und resolve_parcel_egrid
    index.ts        # CLI-Einstiegspunkt
    oerebTool.ts    # Tool- und Resource-Registrierung
    server.ts       # MCP-Server-Erzeugung und stdio-Start
  test/
    egrid.test.ts
    mcpServer.test.ts
    oerebTool.test.ts
```

Die Logik für EGRID, URL-Erzeugung und Feature-Auflösung ist bewusst unabhängig von der Tool-Registrierung gehalten. Spätere Tools für Gebäude, Gemeinden, Adressen oder Koordinaten können dieselbe Struktur erweitern.

## Tests

```bash
npm test
```

Die Tests prüfen:

- gültige und ungültige EGRID-Werte.
- URL-Erzeugung mit `URLSearchParams`.
- Tool-Ergebnis mit Text, `structuredContent` und UI-Metadaten.
- generische Grundstückauflösung über gemockte SO-Suchservice- und Dataservice-Antworten.
- eindeutige Treffer, Schreibvarianten, Mehrdeutigkeit, keine Treffer und technische Dienstfehler.
- App-HTML mit iframe, Direktlink und MCP-App-Bridge-Nachrichten.
- MCP-Integration mit In-Memory-Transport, inklusive `tools/list`, `tools/call` und `resources/read`.

## Build und Typecheck

```bash
npm run typecheck
npm run build
```

Der Build schreibt die JavaScript-Dateien nach `dist/`. Desktop-Hosts sollen immer auf `dist/index.js` zeigen, nicht auf die TypeScript-Quellen.

## Bekannte Einschränkungen

- Die App bindet `https://geo.so.ch/map/?oereb_egrid=<EGRID>` in einem iframe ein. Zum Zeitpunkt der Umsetzung setzt die Zielseite keinen sichtbaren `X-Frame-Options`-Header und keine `frame-ancestors`-Sperre. Das kann sich ändern.
- Falls die Einbettung blockiert wird, bleibt der Link `In geo.so.ch öffnen` nutzbar.
- Der generische Resolver unterstützt in v1 nur `parcel`.
- Live-Netzwerktests gegen `geo.so.ch` sind nicht Teil von `npm test`; die Tests mocken die SO-Antworten.
- Es wird keine `.mcpb` Desktop Extension gebaut. Für die Demo reicht die lokale `stdio`-Einbindung.

## Quellen

- [gdi-mcp-tools Blueprint](https://codeberg.org/edigonzales/gdi-mcp-tools/raw/branch/main/README.md)
- [SO Suchservice](https://so.ch/verwaltung/bau-und-justizdepartement/amt-fuer-geoinformation/geoportal/geodienste/suchservice/)
- [SO Search API](https://geo.so.ch/api/search/v2/api/)
- [SO Dataservice](https://so.ch/verwaltung/bau-und-justizdepartement/amt-fuer-geoinformation/geoportal/geodienste/dataservice/)
- [SO Data API](https://geo.so.ch/api/data/v1/api)
- [SO ÖREB-Webservice](https://so.ch/verwaltung/bau-und-justizdepartement/amt-fuer-geoinformation/geoportal/geodienste/oereb-webservice/)
- [MCP Apps Übersicht](https://modelcontextprotocol.io/extensions/apps/overview)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps/)
- [Claude Desktop lokale MCP-Server](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [Goose MCP Apps](https://goose-docs.ai/docs/guides/interactive-chat/)
