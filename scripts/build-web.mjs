import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(projectRoot, "web");
const outputRoot = resolve(process.argv[2] || resolve(projectRoot, "dist"));
const umamiScriptUrl = process.env.UMAMI_SCRIPT_URL?.trim();
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID?.trim();
const umamiDomains = process.env.UMAMI_DOMAINS?.trim();

const cities = [
    {
        id: "berlin",
        name: "Berlin",
        network: "VBB",
        hostname: "berlin.transitradar.de",
        title: "Live-ÖPNV-Karte Berlin – Abfahrten &amp; Verspätungen | TransitRadar",
        description:
            "Live-ÖPNV-Karte für Berlin mit Fahrzeugpositionen, Haltestellen, aktuellen Abfahrten, Verspätungen und Linien im VBB-Netz.",
        image: "https://transitradar.de/assets/landing/berlin-neu.png",
        imageAlt: "TransitRadar Live-ÖPNV-Karte für Berlin",
        featureText: "Live-Fahrzeuge, Haltestellen, aktuelle Abfahrten und Verspätungen"
    },
    {
        id: "hamburg",
        name: "Hamburg",
        network: "HVV",
        hostname: "hamburg.transitradar.de",
        title: "HVV Live-Karte Hamburg – Abfahrten &amp; Fahrzeuge | TransitRadar",
        description:
            "Live-ÖPNV-Karte für Hamburg mit Fahrzeugpositionen, Haltestellen, aktuellen Abfahrten, Verspätungen und Linien im HVV-Netz.",
        image: "https://transitradar.de/assets/landing/hamburg-neu.png",
        imageAlt: "TransitRadar Live-ÖPNV-Karte für Hamburg",
        featureText: "Live-Fahrzeuge, Haltestellen, aktuelle Abfahrten und Verspätungen"
    },
    {
        id: "frankfurt",
        name: "Frankfurt am Main",
        network: "RMV",
        hostname: "frankfurt.transitradar.de",
        title: "RMV Karte Frankfurt – Live-Abfahrten &amp; Verspätungen | TransitRadar",
        description:
            "Interaktive ÖPNV-Karte für Frankfurt mit Haltestellen, aktuellen Abfahrten, Verspätungen und Linien im RMV-Netz.",
        image: "https://transitradar.de/assets/landing/frankfurt-rmv.png",
        imageAlt: "TransitRadar ÖPNV-Karte für Frankfurt am Main",
        featureText: "Haltestellen, aktuelle Abfahrten, Verspätungen und Fahrtverläufe"
    }
];

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeJsonForHtml(value) {
    return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtmlAttribute(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function createUmamiTracker() {
    if (!umamiScriptUrl && !umamiWebsiteId) {
        return "";
    }

    if (!umamiScriptUrl || !umamiWebsiteId) {
        throw new Error(
            "UMAMI_SCRIPT_URL and UMAMI_WEBSITE_ID must either both be set or both be omitted."
        );
    }

    const domainsAttribute = umamiDomains
        ? `\n        data-domains="${escapeHtmlAttribute(umamiDomains)}"`
        : "";

    return `    <script
        defer
        src="${escapeHtmlAttribute(umamiScriptUrl)}"
        data-website-id="${escapeHtmlAttribute(umamiWebsiteId)}"${domainsAttribute}
        data-do-not-track="true"
        data-performance="true"
    ></script>
`;
}

function injectBeforeHeadEnd(html, content) {
    if (!content) {
        return html;
    }

    if (!html.includes("</head>")) {
        throw new Error("Cannot inject Umami tracker: missing </head>.");
    }

    return html.replace("</head>", `${content}</head>`);
}

function createSeoHead(city) {
    const url = `https://${city.hostname}/`;
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: `TransitRadar ${city.name}`,
        url,
        description: city.description,
        applicationCategory: "TravelApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        inLanguage: "de",
        isAccessibleForFree: true
    };

    return `<!-- CITY_SEO_START -->
    <title>${city.title}</title>
    <meta name="description" content="${city.description}">
    <meta name="theme-color" content="#08090d">
    <link rel="canonical" href="${url}">

    <meta property="og:type" content="website">
    <meta property="og:locale" content="de_DE">
    <meta property="og:site_name" content="TransitRadar">
    <meta property="og:title" content="${city.title}">
    <meta property="og:description" content="${city.description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${city.image}">
    <meta property="og:image:alt" content="${city.imageAlt}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${city.title}">
    <meta name="twitter:description" content="${city.description}">
    <meta name="twitter:image" content="${city.image}">

    <script type="application/ld+json">${escapeJsonForHtml(structuredData)}</script>
    <!-- CITY_SEO_END -->`;
}

function createCitySummary(city) {
    return `<!-- CITY_SUMMARY_START -->
    <section class="city-summary" aria-labelledby="citySummaryTitle">
        <h1 id="citySummaryTitle">Live-ÖPNV-Karte ${city.name}</h1>
        <p id="citySummaryText">
            Entdecke ${city.featureText} im ${city.network}-Netz auf einer
            interaktiven Karte. TransitRadar ist ein unabhängiges Projekt.
        </p>
    </section>
    <!-- CITY_SUMMARY_END -->`;
}

function replaceSection(html, startMarker, endMarker, replacement) {
    const pattern = new RegExp(
        `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`
    );

    if (!pattern.test(html)) {
        throw new Error(`Missing template section: ${startMarker}`);
    }

    return html.replace(pattern, replacement);
}

function createSitemap(url) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${url}</loc>
    </url>
</urlset>
`;
}

function createRobots(sitemapUrl) {
    return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
}

await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });

const cityTemplate = await readFile(resolve(sourceRoot, "city.html"), "utf8");
const umamiTracker = createUmamiTracker();

for (const city of cities) {
    let cityHtml = replaceSection(
        cityTemplate,
        "<!-- CITY_SEO_START -->",
        "<!-- CITY_SEO_END -->",
        createSeoHead(city)
    );
    cityHtml = replaceSection(
        cityHtml,
        "<!-- CITY_SUMMARY_START -->",
        "<!-- CITY_SUMMARY_END -->",
        createCitySummary(city)
    );
    cityHtml = injectBeforeHeadEnd(cityHtml, umamiTracker);

    await writeFile(resolve(outputRoot, `city-${city.id}.html`), cityHtml);
    await writeFile(
        resolve(outputRoot, `sitemap-${city.id}.xml`),
        createSitemap(`https://${city.hostname}/`)
    );
    await writeFile(
        resolve(outputRoot, `robots-${city.id}.txt`),
        createRobots(`https://${city.hostname}/sitemap.xml`)
    );
}

for (const filename of ["index.html", "city.html", "status.html"]) {
    const path = resolve(outputRoot, filename);
    const html = await readFile(path, "utf8");
    await writeFile(path, injectBeforeHeadEnd(html, umamiTracker));
}

await writeFile(
    resolve(outputRoot, "sitemap-root.xml"),
    createSitemap("https://transitradar.de/")
);
await writeFile(
    resolve(outputRoot, "robots-root.txt"),
    createRobots("https://transitradar.de/sitemap.xml")
);
await writeFile(
    resolve(outputRoot, "robots-status.txt"),
    "User-agent: *\nAllow: /\n"
);
