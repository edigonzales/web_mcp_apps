import { describe, expect, it } from "vitest";
import { OEREB_APP_RESOURCE_URI } from "../src/constants.js";
import { createOerebAppHtml } from "../src/appHtml.js";
import { createShowOerebResult } from "../src/oerebTool.js";

describe("ÖREB-App-Tool", () => {
  it("liefert Text, strukturierte Daten und UI-Metadaten", () => {
    const result = createShowOerebResult("CH807306583219");

    expect(result.content[0].text).toContain("CH807306583219");
    expect(result.structuredContent).toEqual({
      egrid: "CH807306583219",
      url: "https://geo.so.ch/map/?oereb_egrid=CH807306583219"
    });
    expect(result._meta.ui.resourceUri).toBe(OEREB_APP_RESOURCE_URI);
  });

  it("liefert eine selbstständige HTML-App mit iframe und Bridge-Nachrichten", () => {
    const html = createOerebAppHtml();

    expect(html).toContain("<iframe");
    expect(html).toContain("https://geo.so.ch/map/");
    expect(html).toContain("URLSearchParams");
    expect(html).toContain("ui/initialize");
    expect(html).toContain("ui/notifications/tool-input");
    expect(html).toContain("ui/notifications/tool-result");
    expect(html).toContain("In geo.so.ch öffnen");
  });
});
