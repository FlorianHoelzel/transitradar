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

test("removes a short narrow hairpin that returns to the same track", () => {
    const segments = extractRouteCoordinateSegments({
        type: "LineString",
        coordinates: [
            [10, 53.5520],
            [10.0002, 53.5516],
            [10.0004, 53.5512],
            [10.00032, 53.55122],
            [10.00010, 53.55162],
            [10.00022, 53.55158],
            [10.0006, 53.5508]
        ]
    });

    assert.equal(
        segments[0].some(point => point[0] === 53.5512),
        false
    );
    assert.equal(
        segments[0].some(point => point[0] === 53.55122),
        false
    );
    assert.deepEqual(segments[0].at(-1), [53.5508, 10.0006]);
});

test("preserves a real turn that does not return along the same corridor", () => {
    const coordinates = [
        [10, 53.5520],
        [10.0004, 53.5516],
        [10.0010, 53.5516],
        [10.0014, 53.5512]
    ];
    const segments = extractRouteCoordinateSegments({
        type: "LineString",
        coordinates
    });

    assert.deepEqual(
        segments,
        [coordinates.map(([longitude, latitude]) => [latitude, longitude])]
    );
});

test("preserves a genuine loop with meaningful width", () => {
    const coordinates = [
        [10, 53.5520],
        [10.0010, 53.5520],
        [10.0010, 53.5514],
        [10, 53.5514],
        [10.00002, 53.55198],
        [9.9998, 53.5524]
    ];
    const segments = extractRouteCoordinateSegments({
        type: "LineString",
        coordinates
    });

    assert.deepEqual(
        segments,
        [coordinates.map(([longitude, latitude]) => [latitude, longitude])]
    );
});
