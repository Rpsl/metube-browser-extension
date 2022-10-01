async function saveOptions() {
    let url = document.getElementById("metube").value;

    if (url.endsWith('/')) {
        url = url.slice(0, -1)
    }

    let sites = document.getElementById("additional").value;

    let sendOnClick = document.getElementById("send-on-click").checked;

    chrome.storage.sync.set({ "metube": url, "sites": sites, "sendOnClick": sendOnClick}, function () {
        document.getElementById("saved").classList.remove('hidden');

        setTimeout(function () {
            document.getElementById("saved").classList.add('hidden');
        }, 1000 * 10)
    });

    sites = splitLines(sites);

    // todo: fix it
    // also need make function for check string
    // https://developer.chrome.com/docs/extensions/mv3/match_patterns/
    if(sites.length <= 1){
        return;
    }

    chrome.contextMenus.update(
        'metube',
        {
            targetUrlPatterns: [
                'https://www.youtube.com/*',
                'https://m.youtube.com/*',
                'https://youtu.be/*',
                ...sites
            ]
        }
    );

}

async function restoreOptions() {
    chrome.storage.sync.get(['metube', 'sites', 'sendOnClick'], function (data) {
        if (data.metube != undefined) {
            document.getElementById("metube").value = data.metube;
        }

        if (data.sites != undefined) {
            document.getElementById("additional").value = data.sites;
        }
        // document.getElementById("send-on-click").checked = true;
        if (data.sendOnClick) {
            document.getElementById("send-on-click").checked = true;
        }
    });
}

function splitLines(t) { return t.split(/\r\n|\r|\n/); }

window.addEventListener("DOMContentLoaded", restoreOptions, { passive: true });

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveOptions();
}, { passive: false });
