import assert from "node:assert/strict";
import test from "node:test";

import {
    extractRouteCoordinateSegments,
    leafletRouteCoordinates
} from "../js/map/routeGeometry.js";

test("preserves separate MultiLineString segments without drawing connectors", () => {
    const segments = extractRouteCoordinateSegments({
        type: "MultiLineString",
        coordinates: [
            [[9.9, 53.5], [9.91, 53.51]],
            [[10, 53.6], [10.01, 53.61]]
        ]
    });

    assert.deepEqual(segments, [
        [[53.5, 9.9], [53.51, 9.91]],
        [[53.6, 10], [53.61, 10.01]]
    ]);
    assert.deepEqual(leafletRouteCoordinates(segments), segments);
});

test("keeps valid FeatureCollection lines separate and rejects invalid points", () => {
    const segments = extractRouteCoordinateSegments({
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[9.9, 53.5], ["invalid", 53.51], [9.92, 53.52]]
                }
            },
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[10, 53.6]]
                }
            }
        ]
    });

    assert.deepEqual(segments, [
        [[53.5, 9.9], [53.52, 9.92]]
    ]);
});

test("returns a flat Leaflet path for one LineString", () => {
    const segments = extractRouteCoordinateSegments({
        type: "LineString",
        coordinates: [[8.6, 50.1], [8.7, 50.2]]
    });

    assert.deepEqual(
        leafletRouteCoordinates(segments),
        [[50.1, 8.6], [50.2, 8.7]]
    );
});
