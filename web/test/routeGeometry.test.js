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

test("connects an ordered VBB FeatureCollection of route points", () => {
    const segments = extractRouteCoordinateSegments({
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: { type: "stop", name: "U Britz-Süd" },
                geometry: { type: "Point", coordinates: [13.44683, 52.43688] }
            },
            {
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [13.44969, 52.43695] }
            },
            {
                type: "Feature",
                properties: { type: "stop", name: "Otto-Wels-Ring" },
                geometry: { type: "Point", coordinates: [13.45292, 52.43533] }
            }
        ]
    });

    assert.deepEqual(segments, [[
        [52.43688, 13.44683],
        [52.43695, 13.44969],
        [52.43533, 13.45292]
    ]]);
});

test("does not connect point runs across an explicit line segment", () => {
    const segments = extractRouteCoordinateSegments({
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [10, 53.5] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [10.01, 53.51] }
            },
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[11, 54], [11.01, 54.01]]
                }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [12, 55] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [12.01, 55.01] }
            }
        ]
    });

    assert.equal(segments.length, 3);
});

test("does not connect VBB point runs across an invalid coordinate", () => {
    const segments = extractRouteCoordinateSegments({
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [13.1, 52.1] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [13.2, 52.2] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [null, null] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [14.1, 53.1] }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [14.2, 53.2] }
            }
        ]
    });

    assert.deepEqual(segments, [
        [[52.1, 13.1], [52.2, 13.2]],
        [[53.1, 14.1], [53.2, 14.2]]
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

test("removes the VBB double backtrack seen at Potsdamer Platz", () => {
    const segments = extractRouteCoordinateSegments({
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [13.37644, 52.50963] }
            },
            {
                type: "Feature",
                properties: {
                    type: "stop",
                    name: "Varian-Fry-Str./Potsdamer Platz (Berlin)"
                },
                geometry: { type: "Point", coordinates: [13.37417, 52.50944] }
            },
            {
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [13.37465, 52.50947] }
            },
            {
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [13.37091, 52.50918] }
            }
        ]
    });

    assert.deepEqual(segments, [[
        [52.50963, 13.37644],
        [52.50918, 13.37091]
    ]]);
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
