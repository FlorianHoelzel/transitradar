import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const buildScript = resolve(projectRoot, "scripts", "build-web.mjs");

function runBuild(outputRoot, environment = {}) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, [buildScript, outputRoot], {
            cwd: projectRoot,
            env: {
                ...process.env,
                UMAMI_SCRIPT_URL: "",
                UMAMI_WEBSITE_ID: "",
                UMAMI_DOMAINS: "",
                ...environment
            },
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stderr = "";

        child.stderr.on("data", chunk => {
            stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", code => {
            resolvePromise({ code, stderr });
        });
    });
}

test("injects the configured Umami tracker into every deployed page", async () => {
    const outputRoot = await mkdtemp(resolve(tmpdir(), "transitradar-build-"));

    try {
        const result = await runBuild(outputRoot, {
            UMAMI_SCRIPT_URL: "https://stats.transitradar.de/script.js",
            UMAMI_WEBSITE_ID: "test-website-id",
            UMAMI_DOMAINS:
                "transitradar.de,berlin.transitradar.de,hamburg.transitradar.de"
        });

        assert.equal(result.code, 0, result.stderr);

        for (const filename of [
            "index.html",
            "status.html",
            "city-berlin.html",
            "city-hamburg.html",
            "city-frankfurt.html"
        ]) {
            const html = await readFile(resolve(outputRoot, filename), "utf8");
            assert.equal((html.match(/data-website-id=/g) || []).length, 1);
            assert.match(
                html,
                /src="https:\/\/stats\.transitradar\.de\/script\.js"/
            );
            assert.match(html, /data-website-id="test-website-id"/);
            assert.match(
                html,
                /data-before-send="transitRadarUmamiBeforeSend"/
            );
            assert.match(html, /const normalizedPath = path\.startsWith/);
            assert.match(html, /data-do-not-track="true"/);
            assert.match(html, /data-performance="true"/);
        }
    } finally {
        await rm(outputRoot, { recursive: true, force: true });
    }
});

test("leaves analytics disabled when Umami is not configured", async () => {
    const outputRoot = await mkdtemp(resolve(tmpdir(), "transitradar-build-"));

    try {
        const result = await runBuild(outputRoot);
        assert.equal(result.code, 0, result.stderr);

        const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
        assert.doesNotMatch(html, /data-website-id=/);
        assert.match(
            await readFile(resolve(outputRoot, "datenschutz.html"), "utf8"),
            /Webanalyse mit Umami/
        );
    } finally {
        await rm(outputRoot, { recursive: true, force: true });
    }
});

test("ships crawlable landing-page content without JavaScript rendering", async () => {
    const outputRoot = await mkdtemp(resolve(tmpdir(), "transitradar-build-"));

    try {
        const result = await runBuild(outputRoot);
        assert.equal(result.code, 0, result.stderr);

        const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
        assert.match(html, /<h1>Wähle deine Stadt\.<\/h1>/);
        assert.match(html, /href="https:\/\/berlin\.transitradar\.de\/"/);
        assert.match(html, /href="https:\/\/hamburg\.transitradar\.de\/"/);
        assert.match(html, /href="https:\/\/frankfurt\.transitradar\.de\/"/);
        assert.doesNotMatch(html, /js\/landing\/App\.js/);
        assert.doesNotMatch(html, /id="landing-root"/);
    } finally {
        await rm(outputRoot, { recursive: true, force: true });
    }
});

test("fails the build when the Umami configuration is incomplete", async () => {
    const outputRoot = await mkdtemp(resolve(tmpdir(), "transitradar-build-"));

    try {
        const result = await runBuild(outputRoot, {
            UMAMI_SCRIPT_URL: "https://stats.transitradar.de/script.js"
        });

        assert.notEqual(result.code, 0);
        assert.match(
            result.stderr,
            /UMAMI_SCRIPT_URL and UMAMI_WEBSITE_ID must either both be set/
        );
    } finally {
        await rm(outputRoot, { recursive: true, force: true });
    }
});
