# sogis-interlis-mcp

Node.js-/TypeScript-MCP-Server fuer SOGIS INTERLIS-Dienste:

- `https://geo.so.ch/ilivalidator`
- `https://geo.so.ch/modelfinder`

Der Server ist eine Adapter- und UI-Schicht. Er implementiert keine eigene INTERLIS-Validierung und keinen eigenen Modellindex.

## Setup

```bash
cd /Users/stefan/sources/web_mcp_apps/sogis-interlis-mcp
npm install
npm run build
npm test
```

Start per stdio:

```bash
npm start -- --stdio
```

Oder im Inspector:

```bash
npm run inspect
```

## Konfiguration

| Variable | Default |
| --- | --- |
| `SOGIS_ILIVALIDATOR_BASE_URL` | `https://geo.so.ch/ilivalidator` |
| `SOGIS_MODELFINDER_BASE_URL` | `https://geo.so.ch/modelfinder` |
| `SOGIS_HTTP_TIMEOUT_MS` | `30000` |
| `SOGIS_MAX_LOG_BYTES` | `2000000` |
| `SOGIS_ALLOWED_ORIGINS` | leer |
| `SOGIS_ALLOWED_FILE_REF_ORIGINS` | leer |
| `SOGIS_SAMPLE_XTF_PATH` | `/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf` |

## Tools

- `list_validation_profiles`
- `validate_interlis_transfer`
- `get_validation_job`
- `get_validation_log`
- `summarize_validation_result`
- `search_interlis_models`
- `build_modelfinder_url`
- `get_modelfinder_context`

## MCP Apps

- `ui://ilivalidator/job-viewer`
- `ui://modelfinder/model-viewer`

Der Job-Viewer verwendet die MCP-App-Bridge, um `get_validation_job` und `get_validation_log` aufzurufen. Falls ein Host keine Tool-Aufrufe aus Apps proxyt, bleiben Text-, Link- und Copy-Fallbacks sichtbar.

Der Modelfinder-Viewer zeigt fuer einen prompt-gesteuerten Suchbegriff eine eigene Trefferliste, eine lokale Detailansicht aus den JSON-Suchmetadaten und eine eingebettete UML-Vorschau. Falls ein Host iframe-Einbettungen blockiert, bleiben direkte Links zur Rohsuche, zur Detailseite und zur UML-Ansicht sichtbar.

## Beispiel: Validierungsjob starten

Fuer lokale Hosts wie Goose ueber stdio ist `fileRefs` der bevorzugte Weg. Goose soll die Datei nicht per `cat` oder `base64` in den Chat-Kontext ausgeben, sondern nur den serverseitig lesbaren Pfad uebergeben:

```json
{
  "fileRefs": [
    "/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf"
  ]
}
```

Unterstuetzte Datei-Referenzen:

- absolute lokale Pfade auf dem Rechner, auf dem der MCP-Server laeuft
- `file://` URLs
- `https://` URLs, wenn deren Origin in `SOGIS_ALLOWED_FILE_REF_ORIGINS` erlaubt ist

Bei HTTP-Transporten sind lokale Pfade immer Pfade auf dem Server, nicht auf dem Goose-Client. Fuer Remote-Setups muss Goose oder ein vorgelagerter Dienst die Datei zuerst unter einer fuer den MCP-Server erreichbaren HTTPS-URL bereitstellen.

Base64-Inhalte bleiben als Fallback unterstuetzt:

```json
{
  "files": [
    {
      "name": "example.xtf",
      "mimeType": "application/xml",
      "dataBase64": "..."
    }
  ],
  "profile": "Nutzungsplanung"
}
```

## Lokaler Smoke-Test mit XTF-Testdatei

Die Datei `/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf` ist ein realer, fehlerfreier Testfall mit dem Modell `SO_AFU_ABBAUSTELLEN_Publikation_20221103`. Sie wird nicht ins Repo kopiert und nicht in Unit-Tests vorausgesetzt.

`validate_interlis_transfer` mit folgendem Payload aufrufen:

```json
{
  "fileRefs": [
    "/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf"
  ]
}
```

Erwartung:

- Der Upload startet einen ilivalidator-Job.
- `get_validation_job` liefert Status und Log-URLs.
- `summarize_validation_result` meldet bei erfolgreichem Abschluss keine Fehler.
- `get_validation_log` ist fuer gezielte Log-Abfragen oder die App gedacht, nicht als erster Chat-Schritt fuer grosse Logs.

## Bekannte Einschränkungen

- Der Modelfinder bleibt eine Adapter-Schicht ueber den externen SOGIS-Dienst; die App rendert Trefferliste und Detailansicht lokal, verwendet fuer UML aber weiterhin die externe Modelfinder-Seite.
- iframe-Einbettung kann je nach Host-CSP oder Frame-Policy blockiert werden; der Viewer zeigt deshalb immer sichtbare Direktlinks fuer Rohsuche, Detail und UML.
- Datei-Upload unterstuetzt lokale und erlaubte HTTPS-Datei-Referenzen sowie Base64-Inhalte als Fallback.
