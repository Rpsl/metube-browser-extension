async function saveOptions() {
    let url = document.getElementById("metube").value;

    if (url.endsWith('/')) {
        url = url.slice(0, -1)
    }

    chrome.storage.sync.set({"metube": url}, function () {
        document.getElementById("saved").classList.remove('hidden');

        setTimeout(function () {
            document.getElementById("saved").classList.add('hidden');
        }, 1000 * 10)
    });
}

async function restoreOptions() {
    chrome.storage.sync.get(['metube'], function (data) {
        if (data.metube === undefined) {
            return
        }
        document.getElementById("metube").value = data.metube;
    });
}

window.addEventListener("DOMContentLoaded", restoreOptions, {passive: true});

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveOptions();
}, {passive: false});
