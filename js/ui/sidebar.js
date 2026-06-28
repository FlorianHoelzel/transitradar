export function setupSidebar() {
    const sidebarToggle = document.createElement("button");
    sidebarToggle.id = "sidebarToggle";
    sidebarToggle.className = "sidebar-toggle liquid-button";
    sidebarToggle.type = "button";
    sidebarToggle.innerHTML = "☰";

    const sidebarOverlay = document.createElement("div");
    sidebarOverlay.id = "sidebarOverlay";
    sidebarOverlay.className = "sidebar-overlay";

    const sidebar = document.createElement("aside");
    sidebar.id = "sidebar";
    sidebar.className = "sidebar liquid-glass";

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div>
                <div class="sidebar-kicker">TransitRadar</div>
                <h2>Menu</h2>
            </div>

            <button id="sidebarClose" class="sidebar-close liquid-button" type="button">
                ×
            </button>
        </div>

        <nav class="sidebar-nav">

            <button class="sidebar-item" type="button">
                <span class="sidebar-item-emoji">⭐</span>
                <span>Favorites</span>
            </button>

            <button class="sidebar-item" type="button">
                <span class="sidebar-item-emoji">⚙️</span>
                <span>Settings</span>
            </button>

        </nav>

        <div class="sidebar-footer">

            <button
                id="aboutButton"
                class="sidebar-item sidebar-about"
                type="button">

                <span class="sidebar-item-emoji">ℹ️</span>
                <span>About</span>

        </div>
    `;

    const aboutOverlay = document.createElement("div");
    aboutOverlay.id = "aboutOverlay";
    aboutOverlay.className = "about-overlay";

    aboutOverlay.innerHTML = `
        <section class="about-panel">
            <div class="about-header">
                <div>
                    <div class="about-kicker">About</div>
                    <h2>TransitRadar Berlin</h2>
                </div>

                <button id="aboutClose" class="about-close" type="button">×</button>
            </div>

            <div class="about-content">
                <p>
                    <strong>TransitRadar Berlin</strong> is a personal web project for exploring public transport in Berlin.
                    The app shows nearby stops, live departures, live vehicle positions, highlighted lines and selected vehicle routes on an interactive map.
                </p>

                <div class="about-card">
                    <h3>🛰️ Data sources</h3>
                    <p>
                        TransitRadar Berlin uses public transport API data from BVG / VBB related endpoints.
                        Stop data, departures, trip details and live vehicle positions may come from different APIs and can update at different intervals.
                    </p>
                </div>

                <div class="about-card warning">
                    <h3>⚠️ Important disclaimer</h3>

                    <p>
                        All information is provided without guarantee.
                    </p>

                    <p>
                        Live vehicle positions are estimates based on publicly available API data and may be delayed,
                        temporarily unavailable or inaccurate due to API limitations.
                    </p>

                    <p>
                        Departures, delays, destinations, routes and stop information may change at any time and should
                        not be considered legally binding.
                    </p>

                    <p>
                        TransitRadar Berlin is an independent project and is
                        <strong>not affiliated with BVG, VBB or Deutsche Bahn.</strong>
                    </p>

                    <p>
                        For official and up-to-date travel information, always use official sources such as
                        <strong>bvg.de</strong>,
                        <strong>bahn.de</strong>
                        or the official BVG / VBB apps.
                    </p>
                </div>

            </div>
        </section>
    `;

    document.body.append(
        sidebarToggle,
        sidebarOverlay,
        sidebar,
        aboutOverlay
    );

    const sidebarClose = document.getElementById("sidebarClose");
    const aboutButton = document.getElementById("aboutButton");
    const aboutClose = document.getElementById("aboutClose");

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("open");
        sidebarToggle.classList.add("hidden");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("open");
        sidebarToggle.classList.remove("hidden");
    }

    function openAbout() {
        aboutOverlay.classList.add("open");
    }

    function closeAbout() {
        aboutOverlay.classList.remove("open");
    }

    sidebarToggle.addEventListener("click", openSidebar);
    sidebarClose.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    aboutButton.addEventListener("click", openAbout);
    aboutClose.addEventListener("click", closeAbout);

    aboutOverlay.addEventListener("click", event => {
        if (event.target === aboutOverlay) {
            closeAbout();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            closeAbout();
        }
    });
}