const iconPaths = {
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    locateFixed: '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    menu: '<path d="M4 12h16"/><path d="M4 18h16"/><path d="M4 6h16"/>',
    radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2a6 6 0 0 1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.5"/><path d="M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h5.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H18"/><circle cx="18" cy="5" r="3"/>',
    settings: '<path d="M9.7 3.4c.6-1.7 4-1.7 4.6 0l.2.6a2 2 0 0 0 2.3 1.3l.6-.1c1.8-.3 3.5 2.6 2.3 4l-.4.5a2 2 0 0 0 0 2.6l.4.5c1.2 1.4-.5 4.3-2.3 4l-.6-.1a2 2 0 0 0-2.3 1.3l-.2.6c-.6 1.7-4 1.7-4.6 0l-.2-.6a2 2 0 0 0-2.3-1.3l-.6.1c-1.8.3-3.5-2.6-2.3-4l.4-.5a2 2 0 0 0 0-2.6l-.4-.5c-1.2-1.4.5-4.3 2.3-4l.6.1A2 2 0 0 0 9.5 4Z"/><circle cx="12" cy="12" r="3"/>',
    slidersHorizontal: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    star: '<path d="M11.5 2.9a.6.6 0 0 1 1 0l2.6 5.2 5.8.8a.6.6 0 0 1 .3 1l-4.2 4.1 1 5.8a.6.6 0 0 1-.9.6L12 17.7l-5.1 2.7a.6.6 0 0 1-.9-.6l1-5.8-4.2-4.1a.6.6 0 0 1 .3-1l5.8-.8Z"/>',
    triangleAlert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
};

function icon(name, label = "") {
    const aria = label ? `aria-label="${label}" role="img"` : 'aria-hidden="true"';

    return `
        <svg
            class="lucide-icon lucide-${name}"
            ${aria}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            ${iconPaths[name]}
        </svg>
    `;
}

function replaceButtonIcon(selector, iconName, label) {
    document.querySelectorAll(selector).forEach(element => {
        if (element.dataset.v2Icon === iconName && element.querySelector(".lucide-icon")) {
            return;
        }

        element.innerHTML = icon(iconName, label);
        element.dataset.v2Icon = iconName;
    });
}

function replaceSidebarIcons() {
    replaceButtonIcon("#sidebarToggle", "menu", "Menü öffnen");
    replaceButtonIcon("#sidebarClose", "x", "Menü schließen");
    replaceButtonIcon("#aboutClose", "x", "Info schließen");

    replaceInlineIcon("#nearbyButton .sidebar-item-emoji", "mapPin", "Haltestellen in der Nähe");
    replaceInlineIcon("#favoritesButton .sidebar-item-emoji", "star", "Favoriten");
    replaceInlineIcon("#settingsButton .sidebar-item-emoji", "settings", "Einstellungen");
    replaceInlineIcon("#aboutButton .sidebar-item-emoji", "info", "Über TransitRadar");
    replaceInlineIcon("#nearbyChevron", "chevronDown");
    replaceInlineIcon("#favoritesChevron", "chevronDown");
}

function svgElement(name, label = "") {
    const template = document.createElement("template");

    template.innerHTML = icon(name, label).trim();
    return template.content.firstElementChild;
}

function replaceInlineIcon(selector, iconName, label = "") {
    const element = document.querySelector(selector);

    if (!element || (element.dataset.v2Icon === iconName && element.querySelector(".lucide-icon"))) {
        return;
    }

    element.replaceChildren(svgElement(iconName, label));
    element.dataset.v2Icon = iconName;
}

function replaceLocationIcon() {
    const locationIcon = document.querySelector("#locationButton .location-button-icon");

    if (
        locationIcon &&
        (locationIcon.dataset.v2Icon !== "locateFixed" || !locationIcon.querySelector(".lucide-icon"))
    ) {
        locationIcon.innerHTML = icon("locateFixed", "Meinen Standort anzeigen");
        locationIcon.dataset.v2Icon = "locateFixed";
    }
}

function replaceFilterIcon() {
    const filterToggle = document.getElementById("filterToggle");

    if (
        filterToggle &&
        (filterToggle.dataset.v2Icon !== "slidersHorizontal" || !filterToggle.querySelector(".lucide-icon"))
    ) {
        filterToggle.innerHTML = `${icon("slidersHorizontal")}<span>Filter</span>`;
        filterToggle.dataset.v2Icon = "slidersHorizontal";
    }
}

function replaceFavoriteIcons() {
    document.querySelectorAll(".station-favorite-button").forEach(button => {
        const activeState = button.classList.contains("active") ? "active" : "idle";

        if (button.dataset.v2Icon === `star-${activeState}` && button.querySelector(".lucide-icon")) {
            return;
        }

        button.innerHTML = icon("star", button.classList.contains("active") ? "Als Favorit gespeichert" : "Als Favorit speichern");
        button.dataset.v2Icon = `star-${activeState}`;
    });

    document.querySelectorAll(".favorite-star").forEach(star => {
        if (star.dataset.v2Icon === "star" && star.querySelector(".lucide-icon")) {
            return;
        }

        star.innerHTML = icon("star", "Favorisierte Haltestelle");
        star.dataset.v2Icon = "star";
    });

    document.querySelectorAll(".favorite-remove").forEach(button => {
        if (button.dataset.v2Icon === "x" && button.querySelector(".lucide-icon")) {
            return;
        }

        button.innerHTML = icon("x", "Favorit entfernen");
        button.dataset.v2Icon = "x";
    });
}

function replaceAboutHeadings() {
    const aboutCards = document.querySelectorAll(".about-card h3");

    aboutCards.forEach(heading => {
        if (heading.dataset.v2IconApplied) {
            return;
        }

        const text = heading.textContent.replace(/[^\w\s]/g, "").trim();
        const iconName = /important/i.test(text) ? "triangleAlert" : "radio";

        heading.innerHTML = `${icon(iconName)}<span>${text}</span>`;
        heading.dataset.v2IconApplied = "true";
    });
}

function applyV2Icons() {
    replaceSidebarIcons();
    replaceLocationIcon();
    replaceFilterIcon();
    replaceFavoriteIcons();
    replaceAboutHeadings();
}

if (document.body.classList.contains("berlin-v2")) {
    applyV2Icons();

    const observer = new MutationObserver(() => {
        applyV2Icons();
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        characterData: true,
        subtree: true
    });
}
