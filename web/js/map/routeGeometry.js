function leafletPoint(coordinate) {
    const longitude = coordinate?.[0];
    const latitude = coordinate?.[1];

    if (
        !Array.isArray(coordinate)
        || longitude === null
        || longitude === undefined
        || latitude === null
        || latitude === undefined
        || !Number.isFinite(Number(longitude))
        || !Number.isFinite(Number(latitude))
        || Number(longitude) < -180
        || Number(longitude) > 180
        || Number(latitude) < -90
        || Number(latitude) > 90
    ) {
        return null;
    }

    return [Number(latitude), Number(longitude)];
}

const METERS_PER_LATITUDE_DEGREE = 110540;
const DOUBLE_BACKTRACK_MAX_ANGLE_DEGREES = 15;
const DOUBLE_BACKTRACK_MAX_BRIDGE_METERS = 100;
const DOUBLE_BACKTRACK_MIN_SAVING_METERS = 20;

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

function interiorAngleDegrees(previous, point, next) {
    const referenceLatitude = (previous[0] + point[0] + next[0]) / 3;
    const a = localPoint(previous, referenceLatitude);
    const b = localPoint(point, referenceLatitude);
    const c = localPoint(next, referenceLatitude);
    const incoming = { x: a.x - b.x, y: a.y - b.y };
    const outgoing = { x: c.x - b.x, y: c.y - b.y };
    const denominator = Math.hypot(incoming.x, incoming.y)
        * Math.hypot(outgoing.x, outgoing.y);

    if (denominator === 0) {
        return 180;
    }

    const cosine = (
        incoming.x * outgoing.x + incoming.y * outgoing.y
    ) / denominator;

    return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

function isDoubleBacktrack(entries, index) {
    const [first, second, third, fourth] = entries.slice(index, index + 4);

    if (!(second.isStop || third.isStop)) {
        return false;
    }

    if (
        interiorAngleDegrees(first.point, second.point, third.point)
            > DOUBLE_BACKTRACK_MAX_ANGLE_DEGREES
        || interiorAngleDegrees(second.point, third.point, fourth.point)
            > DOUBLE_BACKTRACK_MAX_ANGLE_DEGREES
        || distanceMeters(second.point, third.point)
            > DOUBLE_BACKTRACK_MAX_BRIDGE_METERS
    ) {
        return false;
    }

    const suppliedLength = distanceMeters(first.point, second.point)
        + distanceMeters(second.point, third.point)
        + distanceMeters(third.point, fourth.point);
    const directLength = distanceMeters(first.point, fourth.point);

    return suppliedLength - directLength >= DOUBLE_BACKTRACK_MIN_SAVING_METERS;
}

function removeVbbDoubleBacktracks(entries) {
    const cleaned = [...entries];
    let index = 0;

    while (index + 3 < cleaned.length) {
        if (isDoubleBacktrack(cleaned, index)) {
            cleaned.splice(index + 1, 2);
            index = Math.max(0, index - 2);
        } else {
            index += 1;
        }
    }

    return cleaned;
}

function drawableSegment(points) {
    const deduplicated = [];

    points.forEach(point => {
        if (
            deduplicated.length === 0
            || distanceMeters(deduplicated.at(-1), point) >= 0.25
        ) {
            deduplicated.push(point);
        }
    });

    return deduplicated.length >= 2 ? [deduplicated] : [];
}

function lineStringSegments(coordinates) {
    return drawableSegment(
        (coordinates || []).map(leafletPoint).filter(Boolean)
    );
}

function pointFeatureSegments(features) {
    const entries = features
        .map(feature => ({
            point: leafletPoint(feature.geometry?.coordinates),
            isStop: feature.properties?.type === "stop"
        }))
        .filter(entry => entry.point);
    const cleaned = removeVbbDoubleBacktracks(entries);
    const drawable = cleaned.length >= 2 ? cleaned : entries;

    return drawableSegment(drawable.map(entry => entry.point));
}

function featureCollectionSegments(features) {
    const segments = [];
    let pointRun = [];

    const flushPointRun = () => {
        if (pointRun.length > 0) {
            segments.push(...pointFeatureSegments(pointRun));
            pointRun = [];
        }
    };

    (features || []).forEach(feature => {
        if (feature?.type === "Feature" && feature.geometry?.type === "Point") {
            if (leafletPoint(feature.geometry.coordinates)) {
                pointRun.push(feature);
            } else {
                flushPointRun();
            }

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
