const optOutButton = document.getElementById("umamiOptOut");
const optOutStatus = document.getElementById("umamiOptOutStatus");
const storageKey = "umami.disabled";

function isOptedOut() {
    return localStorage.getItem(storageKey) === "1";
}

function renderOptOutState() {
    const optedOut = isOptedOut();

    optOutButton.textContent = optedOut
        ? "Statistik-Erfassung wieder aktivieren"
        : "Statistik-Erfassung deaktivieren";
    optOutStatus.textContent = optedOut
        ? `Die Statistik-Erfassung ist auf ${window.location.hostname} deaktiviert.`
        : `Die Statistik-Erfassung ist auf ${window.location.hostname} aktiv.`;
    optOutStatus.classList.toggle("disabled", optedOut);
}

optOutButton.addEventListener("click", () => {
    if (isOptedOut()) {
        localStorage.removeItem(storageKey);
    } else {
        localStorage.setItem(storageKey, "1");
    }

    renderOptOutState();
});

renderOptOutState();
