import { map } from "../map/map.js";

let userLocationMarker = null;
let isLocating = false;

const LOCATION_ZOOM = 16;

function createLocationIcon() {
    return L.divIcon({
        className: "user-location-marker",
        html: `
            <div class="user-location-pulse"></div>
            <div class="user-location-dot"></div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

function setButtonState(button, state) {
    button.classList.remove("loading", "active", "error");
    button.classList.add(state);
}

function showUserLocation(latitude, longitude, accuracy) {
    const position = [latitude, longitude];

    if (!userLocationMarker) {
        userLocationMarker = L.marker(position, {
            icon: createLocationIcon(),
            interactive: false,
            zIndexOffset: 10000
        }).addTo(map);
    } else {
        userLocationMarker.setLatLng(position);
    }

    map.flyTo(position, LOCATION_ZOOM, {
        duration: 0.9,
        easeLinearity: 0.25
    });

    console.log(`Location accuracy: ${Math.round(accuracy)}m`);
}

function handleLocationError(error, button) {
    console.warn("Geolocation failed:", error);

    setButtonState(button, "error");

    setTimeout(() => {
        button.classList.remove("error");
    }, 1800);
}

function locateUser(button) {
    if (isLocating) {
        return;
    }

    if (!navigator.geolocation) {
        handleLocationError("Geolocation is not supported.", button);
        return;
    }

    isLocating = true;
    setButtonState(button, "loading");

    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude, accuracy } = position.coords;

            showUserLocation(latitude, longitude, accuracy);

            isLocating = false;
            setButtonState(button, "active");
        },
        error => {
            isLocating = false;
            handleLocationError(error, button);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        }
    );
}

export function createLocationButton() {
    const button = document.createElement("button");

    button.id = "locationButton";
    button.className = "location-button";
    button.type = "button";
    button.title = "Locate me";
    button.setAttribute("aria-label", "Locate me");

    button.innerHTML = `
        <span class="location-button-icon">⌖</span>
    `;

    button.addEventListener("click", () => {
        locateUser(button);
    });

    document.body.appendChild(button);
}