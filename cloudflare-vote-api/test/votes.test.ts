import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

const installationId = "32f5e3e7-85c7-49d2-950a-29471a30e317";

describe("vote API", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM votes"),
      env.DB.prepare("DELETE FROM sqlite_sequence WHERE name = 'votes'"),
    ]);
  });

  it("stores a valid vote and returns its voter number", async () => {
    const response = await submit(validVote());

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      voterNumber: 1,
      choices: ["motogp", "wec"],
      alreadySubmitted: false,
    });

    const stored = await env.DB.prepare(
      "SELECT platform, edge_country_code, choices_json FROM votes WHERE id = 1",
    ).first<{
      platform: string;
      edge_country_code: string | null;
      choices_json: string;
    }>();
    expect(stored?.platform).toBe("android");
    expect(stored?.edge_country_code).toBeNull();
    expect(JSON.parse(stored?.choices_json ?? "[]")).toEqual(["motogp", "wec"]);
  });

  it("returns the existing receipt for the same installation", async () => {
    expect((await submit(validVote())).status).toBe(201);
    const duplicate = await submit({
      ...validVote(),
      choices: ["wrc"],
    });

    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toMatchObject({
      voterNumber: 1,
      choices: ["motogp", "wec"],
      alreadySubmitted: true,
    });

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM votes",
    ).first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  it("accepts a vote from the Next.js web app", async () => {
    const response = await submit({
      ...validVote(),
      platform: "web",
      deviceName: "browser",
    });

    expect(response.status).toBe(201);
    const stored = await env.DB.prepare(
      "SELECT platform FROM votes WHERE installation_id = ?",
    ).bind(installationId).first<{ platform: string }>();
    expect(stored?.platform).toBe("web");
  });

  it("rejects F1 and more than three selections", async () => {
    const f1 = await submit({ ...validVote(), choices: ["f1"] });
    expect(f1.status).toBe(400);
    expect(await f1.json()).toEqual({ error: "invalid_vote" });

    const tooMany = await submit({
      ...validVote(),
      choices: ["motogp", "wec", "nascar", "gt"],
    });
    expect(tooMany.status).toBe(400);
  });

  it("reports a healthy D1 binding", async () => {
    const response = await exports.default.fetch("https://example.com/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

});

function submit(body: Record<string, unknown>): Promise<Response> {
  return exports.default.fetch("https://example.com/v1/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validVote(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    installationId,
    platform: "android",
    deviceModel: "Google Pixel 9",
    deviceName: "tokay",
    platformIdentifier: null,
    osVersion: "Android 16 (SDK 36)",
    deviceTimezone: "+0330",
    deviceUtcOffsetMinutes: 210,
    deviceLocale: "fa-IR",
    deviceRegionCode: "IR",
    choices: ["motogp", "wec"],
    clientSubmittedAt: "2026-09-30T18:00:00.000Z",
  };
}
