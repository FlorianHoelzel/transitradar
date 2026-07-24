function leafletPoint(coordinate) {
    if (
        !Array.isArray(coordinate)
        || !Number.isFinite(Number(coordinate[0]))
        || !Number.isFinite(Number(coordinate[1]))
    ) {
        return null;
    }

    return [Number(coordinate[1]), Number(coordinate[0])];
}

const METERS_PER_LATITUDE_DEGREE = 110540;
const HAIRPIN_RETURN_DISTANCE_METERS = 14;
const HAIRPIN_MIN_LENGTH_METERS = 45;
const HAIRPIN_MAX_LENGTH_METERS = 350;
const HAIRPIN_MAX_WIDTH_METERS = 18;

function localPoint(point, referenceLatitude) {
    return {
        x: point[1] * 111320 * Math.cos(referenceLatitude * Math.PI / 180),
        y: point[0] * METERS_PER_LATITUDE_DEGREE
    };
}

function distanceMeters(first, second) {
    const referenceLatitude = (first[0] + second[0]) / 2;
    const a = localPoint(first, referenceLatitude);
    const b = localPoint(second, referenceLatitude);

    return Math.hypot(a.x - b.x, a.y - b.y);
}

function closestPointOnSegment(point, start, end) {
    const referenceLatitude = (point[0] + start[0] + end[0]) / 3;
    const local = localPoint(point, referenceLatitude);
    const localStart = localPoint(start, referenceLatitude);
    const localEnd = localPoint(end, referenceLatitude);
    const dx = localEnd.x - localStart.x;
    const dy = localEnd.y - localStart.y;
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared === 0
        ? 0
        : Math.min(Math.max(
            ((local.x - localStart.x) * dx + (local.y - localStart.y) * dy)
                / lengthSquared,
            0
        ), 1);
    const projected = [
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction
    ];

    return {
        point: projected,
        distance: distanceMeters(point, projected)
    };
}

function pathLengthMeters(points) {
    let length = 0;

    for (let index = 1; index < points.length; index += 1) {
        length += distanceMeters(points[index - 1], points[index]);
    }

    return length;
}

function isNarrowDetour(points) {
    const referenceLatitude = points.reduce((sum, point) => sum + point[0], 0)
        / points.length;
    const local = points.map(point => localPoint(point, referenceLatitude));
    const center = local.reduce((value, point) => {
        return { x: value.x + point.x, y: value.y + point.y };
    }, { x: 0, y: 0 });

    center.x /= local.length;
    center.y /= local.length;

    let xx = 0;
    let xy = 0;
    let yy = 0;

    local.forEach(point => {
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        xx += dx * dx;
        xy += dx * dy;
        yy += dy * dy;
    });

    const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
    const perpendicular = { x: -Math.sin(angle), y: Math.cos(angle) };
    const offsets = local.map(point => {
        return point.x * perpendicular.x + point.y * perpendicular.y;
    });
    const width = Math.max(...offsets) - Math.min(...offsets);

    return width <= HAIRPIN_MAX_WIDTH_METERS;
}

function removeNarrowHairpins(points) {
    const cleaned = [];

    points.forEach(point => {
        if (cleaned.length > 0 && distanceMeters(cleaned.at(-1), point) < 0.25) {
            return;
        }

        let hairpin = null;

        for (let index = cleaned.length - 3; index >= 0; index -= 1) {
            const closest = closestPointOnSegment(
                point,
                cleaned[index],
                cleaned[index + 1]
            );

            if (closest.distance > HAIRPIN_RETURN_DISTANCE_METERS) {
                continue;
            }

            const detour = [
                closest.point,
                ...cleaned.slice(index + 1),
                point
            ];
            const length = pathLengthMeters(detour);

            if (
                length >= HAIRPIN_MIN_LENGTH_METERS
                && length <= HAIRPIN_MAX_LENGTH_METERS
                && isNarrowDetour(detour)
            ) {
                hairpin = { index, closest };
                break;
            }
        }

        if (hairpin) {
            cleaned.splice(hairpin.index + 1);

            if (distanceMeters(cleaned.at(-1), hairpin.closest.point) >= 0.25) {
                cleaned.push(hairpin.closest.point);
            }

            return;
        }

        if (cleaned.length === 0 || distanceMeters(cleaned.at(-1), point) >= 0.25) {
            cleaned.push(point);
        }
    });

    return cleaned;
}

function lineStringSegments(coordinates) {
    const points = (coordinates || [])
        .map(leafletPoint)
        .filter(Boolean);
    const cleaned = removeNarrowHairpins(points);
    const drawable = cleaned.length >= 2 ? cleaned : points;

    return drawable.length >= 2 ? [drawable] : [];
}

function featureCollectionSegments(features) {
    const segments = [];
    let pointRun = [];

    const flushPointRun = () => {
        if (pointRun.length > 0) {
            segments.push(...lineStringSegments(pointRun));
            pointRun = [];
        }
    };

    (features || []).forEach(feature => {
        if (feature?.type === "Feature" && feature.geometry?.type === "Point") {
            pointRun.push(feature.geometry.coordinates);
            return;
        }

        flushPointRun();
        segments.push(...extractRouteCoordinateSegments(feature));
    });

    flushPointRun();
    return segments;
}

export function extractRouteCoordinateSegments(polyline) {
    if (!polyline) {
        return [];
    }

    if (polyline.type === "FeatureCollection") {
        return featureCollectionSegments(polyline.features);
    }

    if (polyline.type === "Feature") {
        return extractRouteCoordinateSegments(polyline.geometry);
    }

    if (polyline.type === "LineString") {
        return lineStringSegments(polyline.coordinates);
    }

    if (polyline.type === "MultiLineString") {
        return (polyline.coordinates || [])
            .flatMap(lineStringSegments);
    }

    return [];
}

export function leafletRouteCoordinates(segments) {
    return segments.length === 1 ? segments[0] : segments;
}
