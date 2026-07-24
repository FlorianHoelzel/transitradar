import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeJourneys,
    normalizeLocations,
    normalizeStopEvents
} from "../src/normalizers.js";
import { parseTriasXml } from "../src/triasXml.js";

function documentWith(payload) {
    return parseTriasXml(`
        <Trias xmlns="http://www.vdv.de/trias">
            <ServiceDelivery><DeliveryPayload>${payload}</DeliveryPayload></ServiceDelivery>
        </Trias>
    `);
}

test("normalizes TRIAS stop locations", () => {
    const stops = normalizeLocations(documentWith(`
        <LocationInformationResponse>
            <LocationResult>
                <Location>
                    <StopPoint>
                        <StopPointRef>de:03241:1</StopPointRef>
                        <StopPointName><Text>Hannover Hauptbahnhof</Text></StopPointName>
                        <Mode><PtMode>rail</PtMode><RailSubmode>suburbanRail</RailSubmode></Mode>
                    </StopPoint>
                    <GeoPosition>
                        <Longitude>9.741</Longitude>
                        <Latitude>52.377</Latitude>
                    </GeoPosition>
                </Location>
            </LocationResult>
        </LocationInformationResponse>
    `));

    assert.equal(stops.length, 1);
    assert.equal(stops[0].id, "de:03241:1");
    assert.equal(stops[0].name, "Hannover Hauptbahnhof");
    assert.equal(stops[0].location.longitude, 9.741);
    assert.equal(stops[0].products.suburban, true);
});

test("filters location results that do not contain coordinates", () => {
    const stops = normalizeLocations(documentWith(`
        <LocationInformationResponse>
            <LocationResult>
                <Location>
                    <StopPoint>
                        <StopPointRef>missing-position</StopPointRef>
                        <StopPointName><Text>Unknown</Text></StopPointName>
                    </StopPoint>
                </Location>
            </LocationResult>
        </LocationInformationResponse>
    `));

    assert.deepEqual(stops, []);
});

test("normalizes realtime departures and retains trip calls", () => {
    const normalized = normalizeStopEvents(documentWith(`
        <StopEventResponse>
            <StopEventResult>
                <ResultId>result-1</ResultId>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <StopPointRef>stop-a</StopPointRef>
                        <StopPointName><Text>Kröpcke</Text></StopPointName>
                        <GeoPosition><Longitude>9.738</Longitude><Latitude>52.374</Latitude></GeoPosition>
                        <PlannedBay><Text>1</Text></PlannedBay>
                        <EstimatedBay><Text>2</Text></EstimatedBay>
                        <ServiceDeparture>
                            <TimetabledTime>2026-07-24T12:00:00Z</TimetabledTime>
                            <EstimatedTime>2026-07-24T12:03:00Z</EstimatedTime>
                        </ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <OnwardCall><CallAtStop>
                        <StopPointRef>stop-b</StopPointRef>
                        <StopPointName><Text>Hauptbahnhof</Text></StopPointName>
                        <GeoPosition><Longitude>9.741</Longitude><Latitude>52.377</Latitude></GeoPosition>
                        <ServiceArrival><TimetabledTime>2026-07-24T12:06:00Z</TimetabledTime></ServiceArrival>
                    </CallAtStop></OnwardCall>
                    <Service>
                        <OperatingDayRef>2026-07-24</OperatingDayRef>
                        <JourneyRef>journey-7</JourneyRef>
                        <LineRef>line-7</LineRef>
                        <PublishedLineName><Text>7</Text></PublishedLineName>
                        <DestinationText><Text>Hauptbahnhof</Text></DestinationText>
                        <Mode><PtMode>tram</PtMode></Mode>
                    </Service>
                </StopEvent>
            </StopEventResult>
        </StopEventResponse>
    `));

    assert.equal(normalized.departures.length, 1);
    assert.equal(normalized.departures[0].tripId, "2026-07-24|journey-7");
    assert.equal(normalized.departures[0].delay, 180);
    assert.equal(normalized.departures[0].platform, "2");
    assert.equal(normalized.departures[0].line.product, "tram");
    assert.equal(normalized.trips[0].trip.stopovers.length, 2);
});

test("normalizes TRIAS trip legs and projections", () => {
    const normalized = normalizeJourneys(documentWith(`
        <TripResponse>
            <TripResult>
                <ResultId>result-2</ResultId>
                <Trip>
                    <TripId>trip-2</TripId>
                    <TripLeg><TimedLeg>
                        <LegBoard>
                            <StopPointRef>origin</StopPointRef>
                            <StopPointName><Text>Origin</Text></StopPointName>
                            <GeoPosition><Longitude>9.70</Longitude><Latitude>52.37</Latitude></GeoPosition>
                            <ServiceDeparture><TimetabledTime>2026-07-24T12:00:00Z</TimetabledTime></ServiceDeparture>
                        </LegBoard>
                        <LegAlight>
                            <StopPointRef>destination</StopPointRef>
                            <StopPointName><Text>Destination</Text></StopPointName>
                            <GeoPosition><Longitude>9.80</Longitude><Latitude>52.40</Latitude></GeoPosition>
                            <ServiceArrival><TimetabledTime>2026-07-24T12:15:00Z</TimetabledTime></ServiceArrival>
                        </LegAlight>
                        <Service>
                            <OperatingDayRef>2026-07-24</OperatingDayRef>
                            <JourneyRef>journey-3</JourneyRef>
                            <PublishedLineName><Text>S4</Text></PublishedLineName>
                            <Mode><PtMode>rail</PtMode><RailSubmode>suburbanRail</RailSubmode></Mode>
                        </Service>
                        <LegTrack><TrackSection>
                            <Projection><Position><Longitude>9.70</Longitude><Latitude>52.37</Latitude></Position></Projection>
                            <Projection><Position><Longitude>9.80</Longitude><Latitude>52.40</Latitude></Position></Projection>
                        </TrackSection></LegTrack>
                    </TimedLeg></TripLeg>
                </Trip>
            </TripResult>
        </TripResponse>
    `));

    assert.equal(normalized.journeys.length, 1);
    assert.equal(normalized.journeys[0].duration, 15 * 60);
    assert.equal(normalized.journeys[0].legs[0].line.product, "suburban");
    assert.deepEqual(
        normalized.journeys[0].legs[0].polyline.geometry.coordinates,
        [[9.70, 52.37], [9.80, 52.40]]
    );
    assert.equal(normalized.trips[0].trip.id, "2026-07-24|journey-3");
});
