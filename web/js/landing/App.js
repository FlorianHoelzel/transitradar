const cities = [
    {
        name: "Berlin",
        network: "VBB",
        state: "ready",
        status: "Live",
        apiStatus: "online",
        image: "./assets/landing/berlin-neu.png",
        href: "https://berlin.transitradar.de/",
        accent: "#f7c948",
        details: "Echtzeitkarte, Stationen, Abfahrten und Fahrzeuge.",
    },
    {
        name: "Hamburg",
        network: "HVV",
        state: "soon",
        status: "Coming soon",
        apiStatus: "pending",
        image: "./assets/landing/hamburg-neu.png",
        href: "#hamburg",
        accent: "#f05252",
        details: "Hafenstadt-Modus ist in Vorbereitung.",
    },
    {
        name: "Frankfurt am Main",
        network: "RMV",
        state: "soon",
        status: "Coming soon",
        apiStatus: "pending",
        image: "./assets/landing/frankfurt-rmv.png",
        href: "#frankfurt-rmv",
        accent: "#009C95",
        details: "S-Bahn, U-Bahn, Tram und Regionalverkehr kommen als Nächstes.",
    },
];

const upcomingCities = ["Köln", "München", "Leipzig", "Dresden", "Stuttgart"];

function CityCard({ city, index }) {
    const isReady = city.state === "ready";

    return React.createElement(
        "a",
        {
            className: `city-card ${isReady ? "city-card--ready" : "city-card--soon"}`,
            href: city.href,
            style: { "--accent": city.accent, "--delay": `${index * 85}ms` },
            "aria-label": `${city.name}: ${city.status}`,
        },
        React.createElement(
            "span",
            { className: "city-image-wrap", "aria-hidden": "true" },
            React.createElement("img", { src: city.image, alt: "" })
        ),
        React.createElement(
            "span",
            { className: "city-info" },
            React.createElement(
                "span",
                { className: "city-heading" },
                React.createElement("strong", null, city.name),
                React.createElement(
                    "span",
                    { className: `city-status city-status--${city.apiStatus}` },
                    React.createElement("span", { className: "api-status-dot", "aria-hidden": "true" }),
                    city.status
                )
            ),
            React.createElement("span", { className: "city-network" }, city.network)
        )
    );
}

function LandingPage() {
    return React.createElement(
        "main",
        { className: "landing-shell" },
        React.createElement("div", { className: "route-field", "aria-hidden": "true" }),
        React.createElement(
            "section",
            { className: "hero" },
            React.createElement(
                "nav",
                { className: "topbar", "aria-label": "TransitRadar" },
                React.createElement("a", { className: "brand", href: "/" }, "TransitRadar")
            ),
            React.createElement(
                "div",
                { className: "hero-grid" },
                React.createElement(
                    "div",
                    { className: "hero-copy" },
                    React.createElement("p", { className: "eyebrow" }, "City launchpad"),
                    React.createElement("h1", null, "Choose your city.")
                ),
                React.createElement(
                    "div",
                    { className: "hero-metrics", "aria-label": "Status" },
                    React.createElement(
                        "span",
                        null,
                        React.createElement("strong", null, "1"),
                        " live"
                    ),
                    React.createElement(
                        "span",
                        null,
                        React.createElement("strong", null, "2"),
                        " coming soon"
                    ),
                    React.createElement(
                        "span",
                        null,
                        React.createElement("strong", null, "5+"),
                        " next"
                    )
                )
            )
        ),
        React.createElement(
            "section",
            { className: "city-section", "aria-label": "Stadtauswahl" },
            React.createElement(
                "div",
                { className: "city-grid" },
                cities.map((city, index) => React.createElement(CityCard, { key: city.name, city, index }))
            ),
            React.createElement(
                "div",
                { className: "more-cities" },
                React.createElement("span", { className: "more-label" }, "Even more cities coming soon"),
                React.createElement(
                    "span",
                    { className: "city-chip-row", "aria-label": "Weitere geplante Städte" },
                    upcomingCities.map((city) => React.createElement("span", { className: "city-chip", key: city }, city))
                )
            )
        )
    );
}

ReactDOM.createRoot(document.getElementById("landing-root")).render(React.createElement(LandingPage));
