export const REGULAR_S_BAHN_LINES = [
    {
        name: "S3",
        // Pinneberg to Neugraben via the City-S-Bahn and Veddel.
        stationIds: [
            "Master:99951", "Master:99950", "Master:98950", "Master:83950",
            "Master:82950", "Master:84960", "Master:84030", "Master:84952",
            "Master:80958", "Master:80953", "Master:80952", "Master:80951",
            "Master:80950", "Master:11952", "Master:11950", "Master:10950",
            "Master:10951", "Master:11943", "Master:54018", "Master:54951",
            "Master:49950", "Master:40950", "Master:42018", "Master:41950",
            "Master:41951"
        ]
    },
    {
        name: "S5",
        // Stade to Elbgaustraße via Harburg, Veddel and Dammtor.
        stationIds: [
            "Master:8000089", "Master:8000434", "Master:8001493",
            "Master:8003002", "Master:8004302", "Master:51989",
            "Master:51988", "Master:8002556", "Master:41951", "Master:41950",
            "Master:42018", "Master:40950", "Master:49950", "Master:54951",
            "Master:54018", "Master:11943", "Master:10951", "Master:10950",
            "Master:11022", "Master:84004", "Master:84951", "Master:80958",
            "Master:84952", "Master:84030", "Master:84960", "Master:82950"
        ]
    }
];

export const REGULAR_STATION_LINES = [
    ...REGULAR_S_BAHN_LINES,
    { name: "2804-AST", stationIds: ["Master:47003"] },
    { name: "8119-AST", stationIds: ["Master:80317"] },
    {
        name: "6669-AST",
        stationIds: [
            "Master:99880",
            "Master:99881",
            "Master:99882",
            "Master:99884",
            "Master:99885"
        ]
    }
];
