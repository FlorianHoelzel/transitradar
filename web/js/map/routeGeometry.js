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

function lineStringSegments(coordinates) {
    const points = (coordinates || [])
        .map(leafletPoint)
        .filter(Boolean);

    return points.length >= 2 ? [points] : [];
}

export function extractRouteCoordinateSegments(polyline) {
    if (!polyline) {
        return [];
    }

    if (polyline.type === "FeatureCollection") {
        return (polyline.features || [])
            .flatMap(feature => extractRouteCoordinateSegments(feature));
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
