import {
    startFavoritesRefresh,
    stopFavoritesRefresh,
    renderFavorites
} from "../favorites/favoriteController.js";

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

        <div id="sidebarContent" class="sidebar-content">
            <nav class="sidebar-nav">
                <button id="nearbyButton" class="sidebar-item" type="button">
                    <span class="sidebar-item-emoji">📍</span>
                    <span>Nearby Stations</span>
                    <span id="nearbyChevron" class="sidebar-chevron">⌄</span>
                </button>

                <section id="nearbyPanel" class="nearby-panel">
                    <div class="nearby-panel-header">
                        <h3>Nearby Stations</h3>
                        <span>Stations close to your location</span>
                    </div>

                    <div id="nearbyList" class="nearby-list">
                        <div class="nearby-empty">
                            Tap the location button to show nearby stations.
                        </div>
                    </div>
                </section>

                <button id="favoritesButton" class="sidebar-item" type="button">
                    <span class="sidebar-item-emoji">⭐</span>
                    <span>Favorites</span>
                    <span id="favoritesChevron" class="sidebar-chevron">⌄</span>
                </button>

                <section id="favoritesPanel" class="favorites-panel">
                    <div class="favorites-panel-header">
                        <h3>Favorites</h3>
                        <span>Live departures</span>
                    </div>

                    <div id="favoritesListWrapper" class="favorites-list-wrapper">
                        <div id="favoritesList" class="favorites-list"></div>
                    </div>
                </section>
            </nav>
        </div>

        <div class="sidebar-footer">
            <button id="settingsButton" class="sidebar-item sidebar-settings" type="button">
                <span class="sidebar-item-emoji">⚙️</span>
                <span>Settings</span>
            </button>

            <button id="aboutButton" class="sidebar-item sidebar-about" type="button">
                <span class="sidebar-item-emoji">ℹ️</span>
                <span>About</span>
            </button>
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
                    <p>All information is provided without guarantee.</p>
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

    document.body.append(sidebarToggle, sidebarOverlay, sidebar, aboutOverlay);

    const sidebarClose = document.getElementById("sidebarClose");

    const nearbyButton = document.getElementById("nearbyButton");
    const nearbyPanel = document.getElementById("nearbyPanel");
    const nearbyChevron = document.getElementById("nearbyChevron");

    const favoritesButton = document.getElementById("favoritesButton");
    const favoritesPanel = document.getElementById("favoritesPanel");
    const favoritesChevron = document.getElementById("favoritesChevron");

    const favoritesList = document.getElementById("favoritesList");
    const favoritesListWrapper = document.getElementById("favoritesListWrapper");

    const aboutButton = document.getElementById("aboutButton");
    const aboutClose = document.getElementById("aboutClose");

    function updateFavoritesFade() {
        if (!favoritesList || !favoritesListWrapper) {
            return;
        }

        const canScroll = favoritesList.scrollHeight > favoritesList.clientHeight;
        const atBottom =
            favoritesList.scrollTop + favoritesList.clientHeight >=
            favoritesList.scrollHeight - 2;

        favoritesList.classList.toggle("has-fade", canScroll && !atBottom);
    }

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

    function toggleNearby() {
        const isOpen = nearbyPanel.classList.toggle("open");

        nearbyButton.classList.toggle("active", isOpen);
        nearbyChevron.classList.toggle("open", isOpen);
    }

    async function toggleFavorites() {
        const isOpen = favoritesPanel.classList.toggle("open");

        favoritesButton.classList.toggle("active", isOpen);
        favoritesChevron.classList.toggle("open", isOpen);

        if (!isOpen) {
            favoritesList.classList.remove("has-fade");
            stopFavoritesRefresh();
            return;
        }

        await renderFavorites();
        updateFavoritesFade();
        startFavoritesRefresh();

        setTimeout(updateFavoritesFade, 50);
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

    nearbyButton.addEventListener("click", toggleNearby);
    favoritesButton.addEventListener("click", toggleFavorites);

    favoritesList?.addEventListener("scroll", updateFavoritesFade);

    window.addEventListener("favoritesChanged", () => {
        setTimeout(updateFavoritesFade, 50);
    });

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
