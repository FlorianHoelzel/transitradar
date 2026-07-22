import { getJourneys, searchStations } from "../api/transitApi.js";
import { createLineBadge } from "../lines/badges.js";
import { showJourneyRoute } from "../map/routeLayer.js";
import { getDisplayStationName } from "../stations/stationNames.js";
import { getStations } from "../stations/stationStore.js";

let isOpen = false;

function dateInputValue(date) {
    return [
        String(date.getDate()).padStart(2, "0"),
        String(date.getMonth() + 1).padStart(2, "0"),
        date.getFullYear()
    ].join(".");
}

function clockInputValue(date) {
    return [date.getHours(), date.getMinutes()]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function parseDateTime(dateValue, clockValue) {
    const match = dateValue.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/u);

    if (!match || !/^\d{2}:\d{2}$/u.test(clockValue)) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const [hours, minutes] = clockValue.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function lineName(line) {
    if (typeof line === "string" || typeof line === "number") {
        return String(line);
    }

    if (!line || typeof line !== "object") {
        return "";
    }

    const value = line.name ?? line.label ?? line.symbol ?? line.product?.name;
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function linePriority(line) {
    const name = lineName(line).trim().toUpperCase();
    const metadata = line && typeof line === "object"
        ? [line.product, line.mode, line.type, line.productName, line.product?.name]
            .filter(value => typeof value === "string")
            .join(" ")
            .toUpperCase()
        : "";

    if (/^S\s*\d/u.test(name) || /S-?BAHN|SUBURBAN/u.test(metadata)) return 0;
    if (/^U\s*\d/u.test(name) || /U-?BAHN|SUBWAY/u.test(metadata)) return 1;
    if (/^(RE|RB|IRE)\s*\d/u.test(name) || /REGIONAL/u.test(metadata)) return 2;
    if (/^(M?\d+|TRAM)/u.test(name) || /TRAM/u.test(metadata)) return 3;
    if (/^(BUS|N|X)\s*\d/u.test(name) || /BUS/u.test(metadata)) return 4;
    return 5;
}

function stationLines(station) {
    const lines = [
        ...(station.lines || []),
        ...(station.stops || []).flatMap(stop => stop.lines || [])
    ];
    const rankedLines = new Map();

    lines.forEach((line, index) => {
        const name = lineName(line);

        if (!name) {
            return;
        }

        const candidate = { name, priority: linePriority(line), index };
        const current = rankedLines.get(name);

        if (!current || candidate.priority < current.priority) {
            rankedLines.set(name, candidate);
        }
    });

    return [...rankedLines.values()]
        .sort((a, b) => a.priority - b.priority || a.index - b.index)
        .map(line => line.name);
}

function rankStations(stations, query) {
    const search = query.trim().toLocaleLowerCase("de-DE");

    if (search.length < 2) {
        return [];
    }

    return stations
        .map(station => {
            const name = getDisplayStationName(station);
            const normalizedName = name.toLocaleLowerCase("de-DE");
            let score = 0;

            if (normalizedName === search) score = 1000;
            else if (normalizedName.startsWith(search)) score = 800;
            else if (normalizedName.split(/\s+/u).some(word => word.startsWith(search))) score = 650;
            else if (normalizedName.includes(search)) score = 500;

            return { station, name, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => {
            return b.score - a.score
                || stationLines(b.station).length - stationLines(a.station).length
                || a.name.localeCompare(b.name, "de-DE", { numeric: true });
        })
        .slice(0, 8);
}

async function findStations(query) {
    const localMatches = rankStations(getStations(), query);

    if (localMatches.length >= 5) {
        return localMatches;
    }

    try {
        const remoteStations = await searchStations(query, 10);
        const stations = [...new Map(
            [...localMatches.map(result => result.station), ...remoteStations]
                .filter(station => station?.id)
                .map(station => [station.id, station])
        ).values()];

        return rankStations(stations, query);
    } catch (error) {
        console.warn("Haltestellenvorschläge konnten nicht geladen werden:", error);
        return localMatches;
    }
}

function formatTime(value) {
    if (!value) {
        return "–";
    }

    return new Date(value).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function journeyTimes(journey) {
    const firstLeg = journey.legs?.[0];
    const lastLeg = journey.legs?.at(-1);
    const departure = journey.departure || firstLeg?.departure || firstLeg?.plannedDeparture;
    const arrival = journey.arrival || lastLeg?.arrival || lastLeg?.plannedArrival;
    const plannedDeparture = journey.plannedDeparture || firstLeg?.plannedDeparture;
    const durationSeconds = Number(journey.duration) || (
        departure && arrival ? Math.max(0, (new Date(arrival) - new Date(departure)) / 1000) : 0
    );

    return { departure, arrival, plannedDeparture, durationSeconds };
}

function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));

    if (minutes < 60) {
        return `${minutes} Min.`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} Std. ${remainingMinutes} Min.` : `${hours} Std.`;
}

function uniqueJourneyLegs(journey) {
    return (journey.legs || []).filter((leg, index, legs) => {
        if (leg.walking || !leg.line?.name) {
            return true;
        }

        return legs[index - 1]?.line?.name !== leg.line.name;
    });
}

function legDurationSeconds(leg) {
    const suppliedDuration = Number(leg.duration);

    if (Number.isFinite(suppliedDuration) && suppliedDuration > 0) {
        return suppliedDuration;
    }

    const departure = leg.departure || leg.plannedDeparture;
    const arrival = leg.arrival || leg.plannedArrival;

    if (!departure || !arrival) {
        return 0;
    }

    return Math.max(0, (new Date(arrival) - new Date(departure)) / 1000);
}

function createWalkingNode(leg) {
    const walk = document.createElement("span");
    const minutes = Math.max(1, Math.round(legDurationSeconds(leg) / 60));

    walk.className = "journey-walk-node";
    walk.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="9" cy="4" r="2"></circle>
            <path d="m10 22 1-5-2-2 1-4 3 3 2 1"></path>
            <path d="m6 12 2-3 2-1 3 1 2 3"></path>
            <path d="m4 16 3-3"></path>
            <path d="m15 22-4-5"></path>
        </svg>
        <span>${minutes} Min.</span>
    `;
    return walk;
}

function createJourneyCard(journey, index, onSelect) {
    const button = document.createElement("button");
    const times = journeyTimes(journey);
    const transitLegs = (journey.legs || []).filter(leg => !leg.walking && leg.line);
    const transfers = Number.isFinite(Number(journey.transfers))
        ? Number(journey.transfers)
        : Math.max(0, transitLegs.length - 1);
    const delaySeconds = times.departure && times.plannedDeparture
        ? Math.max(0, (new Date(times.departure) - new Date(times.plannedDeparture)) / 1000)
        : 0;

    button.className = "journey-card";
    button.type = "button";
    button.dataset.journeyIndex = String(index);
    button.setAttribute(
        "aria-label",
        `Verbindung ${formatTime(times.departure)} bis ${formatTime(times.arrival)}`
    );

    const timeRow = document.createElement("div");
    timeRow.className = "journey-card-times";
    timeRow.innerHTML = `
        <span>${formatTime(times.departure)}</span>
        <span class="journey-card-duration">${formatDuration(times.durationSeconds)}</span>
        <span>${formatTime(times.arrival)}</span>
    `;

    const lineRow = document.createElement("div");
    lineRow.className = "journey-card-lines";

    uniqueJourneyLegs(journey).forEach((leg, legIndex) => {
        if (legIndex > 0) {
            const connector = document.createElement("span");
            connector.className = "journey-leg-connector";
            connector.setAttribute("aria-hidden", "true");
            lineRow.appendChild(connector);
        }

        if (leg.walking || !leg.line?.name) {
            lineRow.appendChild(createWalkingNode(leg));
            return;
        }

        const badge = document.createElement("span");
        badge.className = "journey-line-node";
        badge.innerHTML = createLineBadge(leg.line.name);
        lineRow.appendChild(badge);
    });

    const metaRow = document.createElement("div");
    metaRow.className = "journey-card-meta";
    metaRow.innerHTML = `
        <span>${transfers === 0 ? "Direkt" : `${transfers} × umsteigen`}</span>
        ${delaySeconds >= 60 ? `<span class="journey-card-delay">+${Math.round(delaySeconds / 60)} Min.</span>` : ""}
    `;

    button.append(timeRow, lineRow, metaRow);
    button.addEventListener("click", () => onSelect(journey, button));
    return button;
}

export function setupRoutePlanner() {
    const toggle = document.getElementById("routePlannerToggle");
    const controls = document.getElementById("topSearchControls");
    const panel = document.getElementById("routePlannerPanel");
    const closeButton = document.getElementById("routePlannerClose");
    const searchRestore = document.getElementById("stationSearchRestore");
    const stationSearchInput = document.getElementById("searchInput");
    const swapButton = document.getElementById("routePlannerSwap");
    const originInput = document.getElementById("routePlannerOrigin");
    const destinationInput = document.getElementById("routePlannerDestination");
    const originSuggestions = document.getElementById("routePlannerOriginSuggestions");
    const destinationSuggestions = document.getElementById("routePlannerDestinationSuggestions");
    const timeMode = document.getElementById("routePlannerTime");
    const timeModeLabel = timeMode.querySelector("span");
    const timeMenu = document.getElementById("routePlannerTimeMenu");
    const dateTimeInput = document.getElementById("routePlannerDateTime");
    const dateInput = document.getElementById("routePlannerDate");
    const clockInput = document.getElementById("routePlannerClock");
    const submitButton = document.getElementById("routePlannerSubmit");
    const status = document.getElementById("routePlannerStatus");
    const resultsContainer = document.getElementById("routePlannerResults");
    let origin = null;
    let destination = null;
    let loading = false;
    let suggestionRequestId = 0;
    let suggestionTimer = null;
    let openTimer = null;

    if (!toggle || !panel) {
        return;
    }

    const initialDateTime = new Date(Date.now() + 10 * 60000);
    dateInput.value = dateInputValue(initialDateTime);
    clockInput.value = clockInputValue(initialDateTime);

    function clearResults() {
        resultsContainer.replaceChildren();
        resultsContainer.scrollTop = 0;
        resultsContainer.classList.remove("scrollable");
        status.classList.remove("error");
        status.textContent = origin && destination
            ? "Bereit zur Verbindungssuche."
            : "Start und Ziel auswählen.";
    }

    function updateSubmitState() {
        const valid = origin?.id && destination?.id && origin.id !== destination.id;
        submitButton.disabled = loading || !valid;
    }

    function closeSuggestions() {
        originSuggestions.classList.remove("open");
        destinationSuggestions.classList.remove("open");
        originInput.setAttribute("aria-expanded", "false");
        destinationInput.setAttribute("aria-expanded", "false");
    }

    function selectStation(kind, station) {
        const input = kind === "origin" ? originInput : destinationInput;
        const suggestions = kind === "origin" ? originSuggestions : destinationSuggestions;

        if (kind === "origin") {
            origin = station;
        } else {
            destination = station;
        }

        input.value = getDisplayStationName(station);
        input.dataset.stationId = station.id;
        suggestions.classList.remove("open");
        input.setAttribute("aria-expanded", "false");
        clearResults();
        updateSubmitState();

        if (kind === "origin" && !destination) {
            destinationInput.focus();
        }
    }

    async function renderSuggestions(kind) {
        const input = kind === "origin" ? originInput : destinationInput;
        const container = kind === "origin" ? originSuggestions : destinationSuggestions;
        const requestId = ++suggestionRequestId;
        const query = input.value;
        const matches = await findStations(query);

        if (requestId !== suggestionRequestId || input.value !== query) {
            return;
        }

        container.replaceChildren();

        matches.forEach(({ station, name }) => {
            const button = document.createElement("button");
            const lines = stationLines(station).slice(0, 6);

            button.className = "route-planner-suggestion";
            button.type = "button";
            button.setAttribute("role", "option");
            button.textContent = name;

            if (lines.length > 0) {
                const lineText = document.createElement("span");
                lineText.className = "route-planner-suggestion-lines";
                lineText.textContent = lines.join(" · ");
                button.appendChild(lineText);
            }

            button.addEventListener("click", () => selectStation(kind, station));
            container.appendChild(button);
        });

        const open = matches.length > 0;
        container.classList.toggle("open", open);
        input.setAttribute("aria-expanded", String(open));
    }

    function setupStationInput(kind, input) {
        const suggestions = kind === "origin" ? originSuggestions : destinationSuggestions;

        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-controls", suggestions.id);
        input.setAttribute("aria-expanded", "false");

        input.addEventListener("input", () => {
            if (kind === "origin") origin = null;
            else destination = null;

            delete input.dataset.stationId;
            clearResults();
            updateSubmitState();
            clearTimeout(suggestionTimer);
            suggestionTimer = setTimeout(() => renderSuggestions(kind), 180);
        });

        input.addEventListener("focus", () => {
            if (input.value.trim().length >= 2) {
                renderSuggestions(kind);
            }
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && suggestions.classList.contains("open")) {
                const firstSuggestion = suggestions.querySelector(".route-planner-suggestion");

                if (firstSuggestion) {
                    event.preventDefault();
                    firstSuggestion.click();
                }
            } else if (event.key === "Escape" && suggestions.classList.contains("open")) {
                event.stopPropagation();
                closeSuggestions();
            }
        });
    }

    function setOpen(nextOpen, focusDestination = true) {
        clearTimeout(openTimer);
        isOpen = nextOpen;
        panel.classList.remove("ready");
        panel.classList.toggle("open", isOpen);
        controls.classList.toggle("route-mode", isOpen);
        toggle.classList.toggle("active", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.tabIndex = isOpen ? -1 : 0;
        panel.setAttribute("aria-hidden", String(!isOpen));
        panel.toggleAttribute("inert", !isOpen);
        searchRestore.tabIndex = isOpen ? 0 : -1;
        document.body.classList.toggle("route-planner-open", isOpen);

        if (!isOpen) {
            closeSuggestions();
        }

        if (isOpen) {
            openTimer = setTimeout(() => {
                panel.classList.add("ready");

                if (focusDestination) {
                    (origin ? destinationInput : originInput).focus();
                }
            }, 310);
        } else if (!isOpen && panel.contains(document.activeElement)) {
            toggle.focus();
        }
    }

    function selectJourney(journey, selectedCard) {
        resultsContainer.querySelectorAll(".journey-card").forEach(card => {
            card.classList.toggle("selected", card === selectedCard);
        });
        showJourneyRoute(journey);
        status.textContent = "Verbindung auf der Karte ausgewählt.";
    }

    function closeTimeMenu() {
        timeMenu.hidden = true;
        timeMode.classList.remove("open");
        timeMode.setAttribute("aria-expanded", "false");
    }

    function setTimeMode(value, label) {
        timeMode.dataset.value = value;
        timeModeLabel.textContent = label;
        dateTimeInput.hidden = value === "now";
        timeMenu.querySelectorAll("[role='option']").forEach(option => {
            option.setAttribute("aria-selected", String(option.dataset.value === value));
        });
        closeTimeMenu();
    }

    async function searchJourneys() {
        if (submitButton.disabled || loading) {
            return;
        }

        loading = true;
        updateSubmitState();
        submitButton.classList.add("loading");
        submitButton.textContent = "Verbindungen werden geladen …";
        resultsContainer.replaceChildren();
        status.classList.remove("error");
        status.textContent = "Echtzeit-Verbindungen werden gesucht …";

        try {
            const timeModeValue = timeMode.dataset.value;
            const requestedDate = timeModeValue === "now"
                ? new Date()
                : parseDateTime(dateInput.value, clockInput.value);

            if (!requestedDate) {
                status.classList.add("error");
                status.textContent = "Bitte Datum als DD.MM.YYYY und eine Uhrzeit eingeben.";
                return;
            }

            const selectedTime = requestedDate.toISOString();
            const journeys = await getJourneys({
                from: origin.id,
                to: destination.id,
                departure: timeModeValue === "arrival" ? undefined : selectedTime,
                arrival: timeModeValue === "arrival" ? selectedTime : undefined
            });

            journeys.forEach((journey, index) => {
                resultsContainer.appendChild(createJourneyCard(journey, index, selectJourney));
            });
            resultsContainer.scrollTop = 0;
            window.requestAnimationFrame(() => {
                resultsContainer.classList.toggle(
                    "scrollable",
                    resultsContainer.scrollHeight > resultsContainer.clientHeight + 1
                );
            });

            status.textContent = journeys.length > 0
                ? `${journeys.length} Verbindungen gefunden.`
                : "Keine passenden Verbindungen gefunden.";
        } catch (error) {
            console.error("Verbindungssuche fehlgeschlagen:", error);
            status.classList.add("error");
            status.textContent = "Verbindungen konnten nicht geladen werden. Bitte erneut versuchen.";
        } finally {
            loading = false;
            submitButton.classList.remove("loading");
            submitButton.textContent = "Verbindungen suchen";
            updateSubmitState();
        }
    }

    setupStationInput("origin", originInput);
    setupStationInput("destination", destinationInput);

    toggle.addEventListener("click", () => setOpen(!isOpen));
    closeButton?.addEventListener("click", () => setOpen(false));
    searchRestore?.addEventListener("click", () => {
        setOpen(false, false);
        window.requestAnimationFrame(() => stationSearchInput?.focus());
    });

    swapButton?.addEventListener("click", () => {
        [origin, destination] = [destination, origin];
        [originInput.value, destinationInput.value] = [
            destinationInput.value,
            originInput.value
        ];
        originInput.dataset.stationId = origin?.id || "";
        destinationInput.dataset.stationId = destination?.id || "";
        clearResults();
        updateSubmitState();
        destinationInput.focus();
    });

    timeMode.addEventListener("click", () => {
        const shouldOpen = timeMenu.hidden;
        timeMenu.hidden = !shouldOpen;
        timeMode.classList.toggle("open", shouldOpen);
        timeMode.setAttribute("aria-expanded", String(shouldOpen));
    });
    timeMenu.addEventListener("click", event => {
        const option = event.target.closest("[data-value]");

        if (option) {
            setTimeMode(option.dataset.value, option.textContent.trim());
        }
    });
    dateInput.addEventListener("blur", () => {
        const digits = dateInput.value.replace(/\D/gu, "").slice(0, 8);

        if (digits.length === 8) {
            dateInput.value = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
        }
    });
    clockInput.addEventListener("blur", () => {
        const digits = clockInput.value.replace(/\D/gu, "").slice(0, 4);

        if (digits.length === 4) {
            clockInput.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
        }
    });

    submitButton.addEventListener("click", searchJourneys);
    destinationInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !destinationSuggestions.classList.contains("open")) {
            searchJourneys();
        }
    });

    document.addEventListener("pointerdown", event => {
        if (!event.target.closest(".route-planner-field")) {
            closeSuggestions();
        }

        if (!event.target.closest(".route-planner-time")) {
            closeTimeMenu();
        }
    });

    window.addEventListener("journeyRoute:cleared", () => {
        resultsContainer.querySelectorAll(".journey-card.selected").forEach(card => {
            card.classList.remove("selected");
        });
        status.textContent = "Route von der Karte entfernt.";
    });

    window.addEventListener("routePlanner:open", () => setOpen(true));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen) {
            setOpen(false);
        }
    });
}
