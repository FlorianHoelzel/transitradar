const cities = [
    {
        name: "Berlin",
        network: "VBB",
        state: "ready",
        status: "Live",
        apiStatus: "online",
        image: "./assets/landing/berlin-neu.png",
        imageSrcSet: "./assets/landing/berlin-neu-640.webp 640w, ./assets/landing/berlin-neu-1254.webp 1254w",
        href: "https://berlin.transitradar.de/",
        accent: "#f7c948",
    },
    {
        name: "Hamburg",
        network: "HVV",
        state: "ready",
        status: "Live",
        apiStatus: "online",
        image: "./assets/landing/hamburg-neu.png",
        imageSrcSet: "./assets/landing/hamburg-neu-640.webp 640w, ./assets/landing/hamburg-neu-1254.webp 1254w",
        href: "https://hamburg.transitradar.de/",
        accent: "#f05252",
    },
    {
        name: "Frankfurt am Main",
        network: "RMV",
        state: "ready",
        status: "Live",
        apiStatus: "online",
        image: "./assets/landing/frankfurt-rmv.png",
        imageSrcSet: "./assets/landing/frankfurt-rmv-640.webp 640w, ./assets/landing/frankfurt-rmv-1254.webp 1254w",
        href: "https://frankfurt.transitradar.de/",
        accent: "#009C95",
    },
];

const upcomingCities = ["Köln", "München", "Leipzig", "Dresden", "Stuttgart"];
const imageSizes = "(max-width: 720px) calc(100vw - 2rem), (max-width: 1020px) calc(50vw - 2.5rem), 390px";

function createElement(tagName, attributes = {}, children = []) {
    const element = document.createElement(tagName);

    Object.entries(attributes).forEach(([name, value]) => {
        if (name === "className") {
            element.className = value;
        } else if (name === "text") {
            element.textContent = value;
        } else {
            element.setAttribute(name, value);
        }
    });

    element.append(...children);
    return element;
}

function createCityCard(city, index) {
    const picture = createElement("picture", { className: "city-image-wrap", "aria-hidden": "true" }, [
        createElement("source", { type: "image/webp", srcset: city.imageSrcSet, sizes: imageSizes }),
        createElement("img", {
            src: city.image,
            alt: "",
            width: "1254",
            height: "1254",
            decoding: "async",
            fetchpriority: "high",
        }),
    ]);
    const status = createElement("span", { className: `city-status city-status--${city.apiStatus}` }, [
        createElement("span", { className: "api-status-dot", "aria-hidden": "true" }),
        document.createTextNode(city.status),
    ]);
    const heading = createElement("span", { className: "city-heading" }, [
        createElement("strong", { text: city.name }),
    ]);
    const meta = createElement("span", { className: "city-meta" }, [
        createElement("span", { className: "city-network", text: city.network }),
        status,
    ]);
    const info = createElement("span", { className: "city-info" }, [
        heading,
        meta,
    ]);
    const card = createElement("a", {
        className: `city-card ${city.state === "ready" ? "city-card--ready" : "city-card--soon"}`,
        href: city.href,
        "aria-label": `${city.name}: ${city.status}`,
    }, [picture, info]);

    card.style.setProperty("--accent", city.accent);
    card.style.setProperty("--delay", `${index * 85}ms`);
    return card;
}

function renderLandingPage() {
    const liveCityCount = cities.filter(city => city.state === "ready").length;
    const metrics = [
        [String(liveCityCount), " live"],
    ].map(([value, label]) => createElement("span", {}, [
        createElement("strong", { text: value }),
        document.createTextNode(label),
    ]));
    const hero = createElement("section", { className: "hero" }, [
        createElement("nav", { className: "topbar", "aria-label": "TransitRadar" }, [
            createElement("a", { className: "brand", href: "/", text: "TransitRadar" }),
        ]),
        createElement("div", { className: "hero-grid" }, [
            createElement("div", { className: "hero-copy" }, [
                createElement("p", { className: "eyebrow", text: "Dein ÖPNV-Radar" }),
                createElement("h1", { text: "Wähle deine Stadt." }),
            ]),
            createElement("div", { className: "hero-metrics", "aria-label": "Status" }, metrics),
        ]),
    ]);
    const cityGrid = createElement("div", { className: "city-grid" }, cities.map(createCityCard));
    const chips = upcomingCities.map(city => createElement("span", { className: "city-chip", text: city }));
    const citySection = createElement("section", { className: "city-section", "aria-label": "Stadtauswahl" }, [
        cityGrid,
        createElement("div", { className: "more-cities" }, [
            createElement("span", { className: "more-label", text: "Weitere Städte folgen bald" }),
            createElement("span", { className: "city-chip-row", "aria-label": "Weitere geplante Städte" }, chips),
        ]),
    ]);

    citySection.append(
        createElement("footer", { className: "landing-footer" }, [
            createElement("a", { href: "/datenschutz", text: "Datenschutz" }),
        ])
    );

    document.getElementById("landing-root").append(
        createElement("main", { className: "landing-shell" }, [
            createElement("div", { className: "route-field", "aria-hidden": "true" }),
            hero,
            citySection,
        ])
    );
}

renderLandingPage();
