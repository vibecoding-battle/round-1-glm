import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const root = import.meta.dirname ?? process.cwd();
const MIN_PORT = Number(process.env.EMBRUNS_MIN_PORT || 8001);
const MAX_TRIES = 24;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

const resolvePath = (urlPath) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  } catch {
    return null;
  }
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const absolute = join(root, safe === "/" ? "index.html" : safe);
  if (absolute !== root && !absolute.startsWith(root + sep)) return null;
  return absolute;
};

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Cache-Control": "no-store" }).end();
    return;
  }

  const filePath = resolvePath(request.url ?? "/");
  if (!filePath) {
    response.writeHead(403).end();
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    const fallback = resolvePath("/");
    const notFound = filePath.endsWith("index.html");
    if (!notFound && statSafe(fallback)) {
      streamFile(response, request, fallback, 200);
    } else {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404");
    }
    return;
  }

  if (stats.isDirectory()) {
    const index = join(filePath, "index.html");
    if (statSafe(index)) {
      streamFile(response, request, index, 200);
    } else {
      response.writeHead(404).end();
    }
    return;
  }

  streamFile(response, request, filePath, 200);
});

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

const HEAD_ONLY = new Set(["GET"]);

function streamFile(response, request, filePath, status) {
  const type = mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

function listen(port, tries) {
  server.listen({ port, host: "127.0.0.1" }, () => {
    console.log(`EMBRUNS READY http://localhost:${port}/`);
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && tries < MAX_TRIES) {
      listen(port + 1, tries + 1);
    } else {
      console.error("EMBRUNS SERVER ERROR", error);
      process.exit(1);
    }
  });
}

listen(MIN_PORT, 0);
