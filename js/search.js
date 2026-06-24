import { map, markers, updateVisibleMarkers } from "./map.js";

export function setupSearch(stations) {
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.toLowerCase();

        searchResults.innerHTML = "";

        if (searchText.length < 2) return;

        const matchingStations = stations.filter(station =>
            station.name.toLowerCase().includes(searchText)
        );

        matchingStations.slice(0, 10).forEach(station => {
            const resultItem = document.createElement("div");
            resultItem.textContent = station.name;

            resultItem.addEventListener("click", () => {
                map.flyTo(station.coordinates, 16, {
                    duration: 0.3
                });

                map.once("moveend", () => {
                    updateVisibleMarkers(stations);

                    setTimeout(() => {
                        if (markers[station.name]) {
                            markers[station.name].openPopup();
                        }
                    }, 100);
                });

                searchInput.value = station.name;
                searchResults.innerHTML = "";
            });

            searchResults.appendChild(resultItem);
        });
    });
}