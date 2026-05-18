import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModelfinderClient } from "../src/services/modelfinderClient.js";

describe("ModelfinderClient", () => {
  it("baut Deep Links mit gesetzten Parametern", () => {
    const client = new ModelfinderClient({ baseUrl: "https://geo.so.ch/modelfinder" });

    assert.equal(
      client.buildUrl({
        query: "wald",
        ilisite: "models.geo.admin.ch",
        expanded: true,
        nologo: true
      }),
      "https://geo.so.ch/modelfinder/?query=wald&ilisite=models.geo.admin.ch&expanded=true&nologo=true"
    );
  });

  it("liefert URL-Embed-Kontext mit nologo", () => {
    const client = new ModelfinderClient({ baseUrl: "https://geo.so.ch/modelfinder" });
    const context = client.getContext({ query: "Abbaustelle", expanded: true });

    assert.equal(context.mode, "url-embed");
    assert.equal(context.url, "https://geo.so.ch/modelfinder/?query=Abbaustelle&expanded=true&nologo=true");
  });
});
