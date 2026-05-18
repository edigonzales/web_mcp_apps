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

## Beispiel: Validierungsjob starten

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

`fileRefs` sind im Schema sichtbar, werden in diesem Prototyp aber noch nicht umgesetzt. Verwende `files[].dataBase64`.

## Lokaler Smoke-Test mit XTF-Testdatei

Die Datei `/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf` ist ein realer, fehlerfreier Testfall mit dem Modell `SO_AFU_ABBAUSTELLEN_Publikation_20221103`. Sie wird nicht ins Repo kopiert und nicht in Unit-Tests vorausgesetzt.

Base64 vorbereiten:

```bash
base64 -i "${SOGIS_SAMPLE_XTF_PATH:-/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf}" > /tmp/ch.so.afu.abbaustellen.xtf.base64
```

Dann `validate_interlis_transfer` mit folgendem Payload aufrufen:

```json
{
  "files": [
    {
      "name": "ch.so.afu.abbaustellen.xtf",
      "mimeType": "application/xml",
      "dataBase64": "<Inhalt von /tmp/ch.so.afu.abbaustellen.xtf.base64>"
    }
  ]
}
```

Erwartung:

- Der Upload startet einen ilivalidator-Job.
- `get_validation_job` liefert Status und Log-URLs.
- `summarize_validation_result` meldet bei erfolgreichem Abschluss keine Fehler.

## Bekannte Einschränkungen

- Modelfinder ist in v1 eine URL-/Frontend-Integration.
- iframe-Einbettung kann je nach Host-CSP oder Frame-Policy blockiert werden; der Viewer zeigt immer einen Deep Link.
- Datei-Upload verwendet v1 Base64-Inhalte; Host-spezifische File-References sind ein Erweiterungspunkt.
