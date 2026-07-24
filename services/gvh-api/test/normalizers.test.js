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

test("combines every transport mode returned for a station", () => {
    const stops = normalizeLocations(documentWith(`
        <LocationInformationResponse>
            <LocationResult>
                <Location>
                    <StopPoint>
                        <StopPointRef>de:03241:11</StopPointRef>
                        <StopPointName><Text>Kröpcke</Text></StopPointName>
                    </StopPoint>
                    <GeoPosition>
                        <Longitude>9.738</Longitude>
                        <Latitude>52.374</Latitude>
                    </GeoPosition>
                </Location>
                <Mode><PtMode>tram</PtMode></Mode>
                <Mode><PtMode>bus</PtMode></Mode>
            </LocationResult>
        </LocationInformationResponse>
    `));

    assert.equal(stops[0].products.tram, true);
    assert.equal(stops[0].products.bus, true);
    assert.equal(stops[0].products.suburban, false);
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

test("derives public GVH and DB line labels from journey references", () => {
    const normalized = normalizeStopEvents(documentWith(`
        <StopEventResponse>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:00:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>gvh:02013::H:j26:51</JourneyRef>
                        <DestinationText><Text>Hemmingen</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:05:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:92H04::H:j26:68</JourneyRef>
                        <DestinationText><Text>Bennemühlen</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:10:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>gvh:04500::H:j26:35</JourneyRef>
                        <DestinationText><Text>Hauptbahnhof</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:15:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:92H01:S:H:j26:31</JourneyRef>
                        <DestinationText><Text>Minden</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:20:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:90H02::H:j26:37</JourneyRef>
                        <DestinationText><Text>Göttingen</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:25:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:91H38::H:j26:18</JourneyRef>
                        <DestinationText><Text>Braunschweig</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
        </StopEventResponse>
    `));

    assert.equal(normalized.departures[0].line.name, "13");
    assert.equal(normalized.departures[0].line.product, "subway");
    assert.equal(normalized.departures[1].line.name, "S4");
    assert.equal(normalized.departures[1].line.product, "suburban");
    assert.equal(normalized.departures[2].line.name, "500");
    assert.equal(normalized.departures[3].line.name, "S1");
    assert.equal(normalized.departures[3].line.product, "suburban");
    assert.equal(normalized.departures[4].line.name, "RE2");
    assert.equal(normalized.departures[4].line.product, "regional");
    assert.equal(normalized.departures[5].line.name, "RB38");
    assert.equal(normalized.departures[5].line.product, "regional");
});

test("hides opaque DB journey references behind a public express label", () => {
    const normalized = normalizeStopEvents(documentWith(`
        <StopEventResponse>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:00:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:98X19:P:R:j26:87</JourneyRef>
                        <DestinationText><Text>Berlin Südkreuz</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
        </StopEventResponse>
    `));

    assert.equal(normalized.departures[0].line.name, "ICE/IC");
    assert.equal(normalized.departures[0].line.product, "express");
});

test("normalizes additional intercity and FlixTrain references", () => {
    const normalized = normalizeStopEvents(documentWith(`
        <StopEventResponse>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:00:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:96X56::H:j26:3</JourneyRef>
                        <DestinationText><Text>Berlin Südkreuz</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
            <StopEventResult>
                <StopEvent>
                    <ThisCall><CallAtStop>
                        <ServiceDeparture><TimetabledTime>2026-07-24T12:05:00Z</TimetabledTime></ServiceDeparture>
                    </CallAtStop></ThisCall>
                    <Service>
                        <JourneyRef>ddb:91030:F:R:j26:69</JourneyRef>
                        <DestinationText><Text>Leipzig Hbf</Text></DestinationText>
                    </Service>
                </StopEvent>
            </StopEventResult>
        </StopEventResponse>
    `));

    assert.equal(normalized.departures[0].line.name, "ICE/IC");
    assert.equal(normalized.departures[0].line.product, "express");
    assert.equal(normalized.departures[1].line.name, "FLX 30");
    assert.equal(normalized.departures[1].line.product, "express");
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
