const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STATIONS_FILE = path.join(DATA_DIR, "stations.json");
const OUTPUT_FILE = path.join(DATA_DIR, "departures.json");

const lines = [
    { name: "U1", product: "subway", directions: ["Warschauer Straße", "Uhlandstraße"] },
    { name: "U2", product: "subway", directions: ["Pankow", "Ruhleben"] },
    { name: "U5", product: "subway", directions: ["Hönow", "Hauptbahnhof"] },
    { name: "U7", product: "subway", directions: ["Rudow", "Rathaus Spandau"] },
    { name: "U8", product: "subway", directions: ["Hermannstraße", "Wittenau"] },

    { name: "S1", product: "suburban", directions: ["Wannsee", "Oranienburg"] },
    { name: "S3", product: "suburban", directions: ["Erkner", "Spandau"] },
    { name: "S5", product: "suburban", directions: ["Strausberg Nord", "Westkreuz"] },
    { name: "S7", product: "suburban", directions: ["Ahrensfelde", "Potsdam Hbf"] },
    { name: "S41", product: "suburban", directions: ["Ring ↻"] },
    { name: "S42", product: "suburban", directions: ["Ring ↺"] },

    { name: "M4", product: "tram", directions: ["Hackescher Markt", "Falkenberg"] },
    { name: "M10", product: "tram", directions: ["Warschauer Straße", "Turmstraße"] },

    { name: "100", product: "bus", directions: ["Alexanderplatz", "Zoo"] },
    { name: "200", product: "bus", directions: ["Michelangelostraße", "Zoo"] },
    { name: "M41", product: "bus", directions: ["Sonnenallee", "Hauptbahnhof"] },

    { name: "RE1", product: "regional", directions: ["Frankfurt (Oder)", "Magdeburg"] },
    { name: "RE7", product: "regional", directions: ["Dessau", "Senftenberg"] }
];

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(minutes) {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function getRandomDelay() {
    return randomItem([0, 0, 0, 0, 60, 120, 180, 300]);
}

function getDepartureCount(station) {
    const products = station.products || {};

    if (products.subway || products.suburban || products.regional) {
        return randomNumber(8, 14);
    }

    if (products.tram) {
        return randomNumber(5, 10);
    }

    return randomNumber(3, 8);
}

function pickLineForStation(station) {
    const products = station.products || {};
    const possibleLines = lines.filter(line => {
        return products[line.product] === true;
    });

    if (possibleLines.length > 0) {
        return randomItem(possibleLines);
    }

    return randomItem(lines);
}

function createDeparture(station, index) {
    const line = pickLineForStation(station);
    const delay = getRandomDelay();
    const minutesFromNow = randomNumber(1, 45) + index * 2;

    return {
        tripId: `mock-departure-${station.id}-${index + 1}`,
        line: {
            name: line.name,
            product: line.product
        },
        direction: randomItem(line.directions),
        when: addMinutes(minutesFromNow),
        plannedWhen: addMinutes(minutesFromNow - delay / 60),
        delay
    };
}

async function loadJson(filePath) {
    const content = await fs.readFile(filePath, "utf8");

    return JSON.parse(content);
}

async function saveJson(filePath, data) {
    await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 4),
        "utf8"
    );
}

async function generateMockDepartures() {
    const stations = await loadJson(STATIONS_FILE);
    const departuresByStationId = {};

    stations.forEach(station => {
        const count = getDepartureCount(station);

        departuresByStationId[station.id] = Array.from(
            { length: count },
            (_, index) => createDeparture(station, index)
        ).sort((a, b) => new Date(a.when) - new Date(b.when));
    });

    await saveJson(OUTPUT_FILE, departuresByStationId);

    console.log(
        `Saved mock departures for ${Object.keys(departuresByStationId).length} stations.`
    );
}

generateMockDepartures().catch(error => {
    console.error("Failed to generate mock departures:", error);
});