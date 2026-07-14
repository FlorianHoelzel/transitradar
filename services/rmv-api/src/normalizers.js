const PRODUCT_CLASS_MAP = [
    [1, "express"],
    [2, "express"],
    [4, "regional"],
    [8, "suburban"],
    [16, "subway"],
    [32, "tram"],
    [64, "bus"],
    [128, "ferry"]
];

function emptyProducts() {
    return {
        express: false,
        regional: false,
        suburban: false,
        subway: false,
        tram: false,
        bus: false,
        ferry: false
    };
}

export function normalizeProducts(productAtStop = []) {
    const products = emptyProducts();

    for (const rawProduct of productAtStop) {
        const productClass = Number(rawProduct?.cls || 0);

        for (const [mask, name] of PRODUCT_CLASS_MAP) {
            if ((productClass & mask) !== 0) {
                products[name] = true;
            }
        }
    }

    return products;
}

export function normalizeStop(stop) {
    const latitude = Number(stop?.lat);
    const longitude = Number(stop?.lon);
    const lines = [...new Set(
        (stop?.productAtStop || []).map(product => product?.name).filter(Boolean)
    )];

    return {
        type: "stop",
        id: stop?.extId || stop?.id,
        name: stop?.name || "",
        location: {
            type: "location",
            latitude,
            longitude
        },
        products: normalizeProducts(stop?.productAtStop),
        lines
    };
}

export function normalizeLocations(data) {
    return (data?.stopLocationOrCoordLocation || [])
        .map(entry => entry?.StopLocation)
        .filter(stop => stop?.extId || stop?.id)
        .map(normalizeStop)
        .filter(stop => {
            return Number.isFinite(stop.location.latitude)
                && Number.isFinite(stop.location.longitude);
        });
}
