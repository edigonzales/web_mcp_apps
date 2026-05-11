import { describe, expect, it } from "vitest";
import { assertValidEgrid, buildOerebUrl, isValidEgrid } from "../src/egrid.js";

describe("EGRID-Validierung", () => {
  it("akzeptiert CH plus 12 Ziffern", () => {
    expect(isValidEgrid("CH807306583219")).toBe(true);
    expect(assertValidEgrid("CH807306583219")).toBe("CH807306583219");
  });

  it("lehnt nicht strikte Werte ab", () => {
    for (const value of ["ch807306583219", "CH80730658321", "CH8073065832199", "DE807306583219", "CH80730658321A", " CH807306583219 "]) {
      expect(isValidEgrid(value)).toBe(false);
      expect(() => assertValidEgrid(value)).toThrow(/EGRID muss exakt/);
    }
  });

  it("erzeugt die ÖREB-URL mit URLSearchParams", () => {
    expect(buildOerebUrl("CH807306583219")).toBe(
      "https://geo.so.ch/map/?oereb_egrid=CH807306583219"
    );
  });
});
