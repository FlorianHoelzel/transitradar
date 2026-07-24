import assert from "node:assert/strict";
import test from "node:test";

import {
    locationInformationRequest,
    parseTriasXml,
    serviceRequest,
    stopEventRequest,
    tripRequest
} from "../src/triasXml.js";

test("escapes credentials and location input in TRIAS requests", () => {
    const request = serviceRequest(
        locationInformationRequest({ query: "A&B <Hbf>", results: 5 }),
        'secret<&"',
        new Date("2026-07-24T12:00:00Z")
    );

    assert.match(request, /A&amp;B &lt;Hbf&gt;/u);
    assert.match(request, /secret&lt;&amp;&quot;/u);
    assert.match(request, /<Language>deu<\/Language>/u);
    assert.match(request, /<NumberOfResults>5<\/NumberOfResults>/u);
});

test("builds departure and trip payloads with the required times", () => {
    const departure = stopEventRequest({
        stopPointRef: "de:03241:1",
        departureTime: "2026-07-24T12:00:00.000Z",
        results: 20
    });
    const trip = tripRequest({
        originRef: "origin",
        destinationRef: "destination",
        arrivalTime: "2026-07-24T13:00:00.000Z",
        results: 5
    });

    assert.match(departure, /<StopEventType>departure<\/StopEventType>/u);
    assert.match(departure, /<DepArrTime>2026-07-24T12:00:00.000Z<\/DepArrTime>/u);
    assert.match(trip, /<Destination>[\s\S]*<DepArrTime>2026-07-24T13:00:00.000Z/u);
    assert.doesNotMatch(trip.match(/<Origin>[\s\S]*?<\/Origin>/u)[0], /<DepArrTime>/u);
});

test("removes namespace prefixes while parsing TRIAS responses", () => {
    const document = parseTriasXml(`
        <Trias xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
            <ServiceDelivery>
                <siri:ResponseTimestamp>2026-07-24T12:00:00Z</siri:ResponseTimestamp>
                <DeliveryPayload><StopEventResponse /></DeliveryPayload>
            </ServiceDelivery>
        </Trias>
    `);

    assert.equal(
        document.Trias.ServiceDelivery.ResponseTimestamp,
        "2026-07-24T12:00:00Z"
    );
});
