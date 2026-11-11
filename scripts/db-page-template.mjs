export function createDbPage(cityHtml) {
    return cityHtml
        .replace(/<!-- CITY_SEO_START -->[\s\S]*?<!-- CITY_SEO_END -->/, `
    <title>Bahnkarte Deutschland | TransitRadar</title>
    <meta name="description" content="ICE- und Regionalzüge, Bahnhöfe und Abfahrten in Deutschland auf einer interaktiven Karte.">
    <meta name="theme-color" content="#08090d">
    <link rel="canonical" href="https://db.transitradar.de/">
    <link rel="stylesheet" href="/styles/db.css?v=db-ui-1">
    <script type="importmap">{"imports":{"/js/config.js":"/js/config.js?v=db-ui-1","/js/settings/settingsStore.js":"/js/settings/settingsStore.js?v=db-ui-1","/js/api/dbDepartures.js":"/js/api/dbDepartures.js?v=db-ui-1"}}</script>`)
        .replace('id="citySummaryTitle">Live-ÖPNV-Karte', 'id="citySummaryTitle">Bahnkarte Deutschland')
        .replace('class="city-app berlin-v2"', 'class="city-app berlin-v2 db-page"')
        .replace('<div id="map"></div>', `<div id="map"></div>
        <p id="mapStatus" class="db-map-status" role="status">Bahnhöfe werden geladen …</p>`)
        .replace(/src="\.\/js\/main\.js[^"]*"/, 'src="/js/dbPage.js?v=db-ui-1"');
}
