import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractJobStart,
  normalizeJob,
  normalizeProfiles
} from "../src/services/ilivalidatorClient.js";
import { parseCsvLog } from "../src/util/logParsing.js";
import { makeAbsoluteUrl, parseRetryAfter } from "../src/util/urls.js";

describe("ilivalidator-Normalisierung", () => {
  it("normalisiert die produktive Profil-Map", () => {
    const profiles = normalizeProfiles({
      profiles: {
        Nutzungsplanung: "ilidata:SO_Nutzungsplanung_20171118_20231101-meta"
      }
    });

    assert.deepEqual(profiles, [
      {
        id: "Nutzungsplanung",
        label: "Nutzungsplanung",
        description: null,
        raw: "ilidata:SO_Nutzungsplanung_20171118_20231101-meta"
      }
    ]);
  });

  it("extrahiert Job-ID aus Operation-Location", () => {
    const result = extractJobStart(
      null,
      "https://geo.so.ch/ilivalidator/api/jobs/4d4aa583-6575-4200-a39c-621a5190d36d",
      "https://geo.so.ch/ilivalidator"
    );

    assert.equal(result.jobId, "4d4aa583-6575-4200-a39c-621a5190d36d");
    assert.equal(
      result.operationLocation,
      "https://geo.so.ch/ilivalidator/api/jobs/4d4aa583-6575-4200-a39c-621a5190d36d"
    );
  });

  it("verwendet JSON-Job-ID als Fallback", () => {
    const result = extractJobStart(
      { jobId: "abc-123" },
      null,
      "https://geo.so.ch/ilivalidator"
    );

    assert.equal(result.jobId, "abc-123");
    assert.equal(result.operationLocation, "https://geo.so.ch/ilivalidator/api/jobs/abc-123");
  });

  it("normalisiert status, Retry-After und Log-URLs", () => {
    const job = normalizeJob(
      {
        status: "PROCESSING",
        csvLogFileLocation: "/api/logs/key/report.csv",
        logFileLocation: "api/logs/key/report.log"
      },
      "job-1",
      new Headers({ "Retry-After": "9" }),
      "https://geo.so.ch/ilivalidator"
    );

    assert.equal(job.jobStatus, "PROCESSING");
    assert.equal(job.retryAfterSeconds, 9);
    assert.equal(job.logs.csv, "https://geo.so.ch/ilivalidator/api/logs/key/report.csv");
    assert.equal(job.logs.text, "https://geo.so.ch/ilivalidator/api/logs/key/report.log");
  });

  it("parst Retry-After Sekunden defensiv", () => {
    assert.equal(parseRetryAfter("12"), 12);
    assert.equal(parseRetryAfter("kein datum"), null);
  });

  it("normalisiert /api-Pfade relativ zur ilivalidator-Base", () => {
    assert.equal(
      makeAbsoluteUrl("/api/logs/key/file.log", "https://geo.so.ch/ilivalidator"),
      "https://geo.so.ch/ilivalidator/api/logs/key/file.log"
    );
  });
});

describe("CSV-Log-Parsing", () => {
  it("parst Semikolon-CSV mit Severity und Meldung", () => {
    const parsed = parseCsvLog("severity;line;message;object\nERROR;12;Pflichtattribut fehlt;Topic.Class");

    assert.equal(parsed.headers.length, 4);
    assert.deepEqual(parsed.rows[0], {
      severity: "ERROR",
      line: 12,
      message: "Pflichtattribut fehlt",
      object: "Topic.Class",
      raw: {
        severity: "ERROR",
        line: "12",
        message: "Pflichtattribut fehlt",
        object: "Topic.Class"
      }
    });
  });
});
