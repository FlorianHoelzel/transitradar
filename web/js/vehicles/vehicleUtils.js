import { CITY_CONFIG, VEHICLE_CONFIG } from "../config.js";
import { getBadgeStyle } from "../lines/lineColors.js";
import { activeFilters } from "../ui/filters.js";
import { getSettings } from "../settings/settingsStore.js";

export function getVehicleType(movement) {
    const lineName = movement.line?.name || "";
    const product = movement.line?.product || "";

    if (
        product === "express" ||
        lineName.startsWith("ICE") ||
        lineName.startsWith("IC") ||
        lineName.startsWith("EC")
    ) {
        return "longDistance";
    }

    if (
        product === "regional" ||
        lineName.startsWith("RE") ||
        lineName.startsWith("RB") ||
        lineName.startsWith("RJ") ||
        lineName === "FEX"
    ) {
        return "regional";
    }

    if (product === "suburban" || lineName.startsWith("S")) {
        return "suburban";
    }

    if (product === "subway" || lineName.startsWith("U")) {
        return "subway";
    }

    return "surface";
}

export function shouldShowVehicle(movement, zoom, selectedLineName = null) {
    const vehicleType = getVehicleType(movement);

    if (!activeFilters.vehicles[vehicleType]) {
        return false;
    }

    if (zoom < VEHICLE_CONFIG.zoomThreshold) {
        return movement.line?.name === selectedLineName;
    }

    return true;
}

export function getVehicleId(movement) {
    if (movement.tripId) {
        return movement.tripId;
    }

    const lineName = movement.line?.name;

    if (!lineName || !movement.direction) {
        return null;
    }

    return `${lineName}-${movement.direction}`;
}

export function cleanStopName(name) {
    return (name || "")
        .replace(/^S\+U\s+/i, "")
        .replace(/^U\s+/i, "")
        .replace(/^S\s+/i, "")
        .replace(new RegExp(`\\s+\\(${CITY_CONFIG.name}\\)$`, "i"), "");
}

export function getLineColor(lineName) {
    const style = getBadgeStyle(lineName);

    if (lineName.startsWith("M")) {
        return "#C0007A";
    }

    if (lineName.startsWith("X")) {
        return "#F39200";
    }

    if (/^\d+$/.test(lineName)) {
        return "#6B7280";
    }

    if (style.background && style.background !== "#fff") {
        return style.background;
    }

    return "#6B7280";
}

export function animateMarker(marker, target) {
    if (marker.animationFrameId) {
        cancelAnimationFrame(marker.animationFrameId);
        marker.animationFrameId = null;
    }

    const start = marker.getLatLng();

    const startLat = start.lat;
    const startLng = start.lng;
    const endLat = target[0];
    const endLng = target[1];

    if (startLat === endLat && startLng === endLng) {
        return;
    }

    if (!getSettings().smoothVehicleMovement) {
        marker.setLatLng(target);
        return;
    }

    const duration = 16000;
    const startTime = performance.now();

    function animate(now) {
        const progress = Math.min((now - startTime) / duration, 1);

        marker.setLatLng([
            startLat + (endLat - startLat) * progress,
            startLng + (endLng - startLng) * progress
        ]);

        if (progress < 1) {
            marker.animationFrameId = requestAnimationFrame(animate);
        } else {
            marker.animationFrameId = null;
        }
    }

    marker.animationFrameId = requestAnimationFrame(animate);
}
