import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT || "4173", 10);
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const webRoot = resolve(projectRoot, "web");

const API_ORIGINS = {
    berlin: "https://api.transitradar.de",
    hamburg: "https://api-hamburg.transitradar.de",
    frankfurt: "https://api-frankfurt.transitradar.de"
};

const CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff2": "font/woff2"
};

function send(response, status, body, contentType = "text/plain; charset=utf-8", cacheControl = "no-store") {
    response.writeHead(status, {
        "content-type": contentType,
        "cache-control": cacheControl
    });
    response.end(body);
}

async function proxyApi(request, response, url) {
    const match = url.pathname.match(/^\/api\/(berlin|hamburg|frankfurt)(\/.*)?$/);

    if (!match) {
        return false;
    }

    const target = new URL(`${match[2] || "/"}${url.search}`, API_ORIGINS[match[1]]);

    try {
        const upstream = await fetch(target, {
            headers: { "user-agent": "TransitRadar local preview" }
        });
        const body = Buffer.from(await upstream.arrayBuffer());

        response.writeHead(upstream.status, {
            "content-type": upstream.headers.get("content-type") || "application/json",
            "cache-control": "no-store"
        });
        response.end(body);
    } catch (error) {
        send(response, 502, `API proxy failed: ${error.message}`);
    }

    return true;
}

function getStaticPath(url) {
    const requestedPath = url.pathname === "/"
        ? "/city.html"
        : url.pathname === "/landing"
            ? "/index.html"
            : url.pathname === "/status"
                ? "/status.html"
                : decodeURIComponent(url.pathname);
    const filePath = resolve(webRoot, `.${requestedPath}`);
    const normalizedRoot = `${webRoot}${sep}`.toLowerCase();

    if (!filePath.toLowerCase().startsWith(normalizedRoot)) {
        return null;
    }

    return filePath;
}

async function serveStatic(response, url) {
    const filePath = getStaticPath(url);

    if (!filePath) {
        send(response, 403, "Forbidden");
        return;
    }

    try {
        const fileStats = await stat(filePath);

        if (!fileStats.isFile()) {
            throw new Error("Not a file");
        }

        send(
            response,
            200,
            await readFile(filePath),
            CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
            url.pathname.startsWith("/assets/") ? "public, max-age=3600" : "no-store"
        );
    } catch {
        send(response, 404, "Not found");
    }
}

createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (await proxyApi(request, response, url)) {
        return;
    }

    await serveStatic(response, url);
}).listen(port, "127.0.0.1", () => {
    console.log(`Frankfurt: http://localhost:${port}/?city=frankfurt`);
    console.log(`Hamburg: http://localhost:${port}/?city=hamburg`);
    console.log(`Berlin:  http://localhost:${port}/?city=berlin`);
});
