async function saveOptions() {
    let url = document.getElementById("metube").value;

    if (url.endsWith('/')) {
        url = url.slice(0, -1)
    }

    let sites = document.getElementById("additional").value;
    let clickBehavior = document.querySelector('input[name="click-behavior"]:checked').value;
    let contextMenuClickBehavior = document.querySelector('input[name="context-menu-click-behavior"]:checked').value;
    let defaultFormat = document.getElementById('default_format').value

    let advancedElements = document.querySelectorAll('#advanced_settings input');

    let advancedSettings = {
        'folder': false,
        'custom_name_prefix': false,
        'disable_auto_start': false
    };
    advancedElements.forEach((e) => {
      advancedSettings[e.name] = e.checked ? true : false
    })

    chrome.storage.sync.set({
        "metube": url,
        "sites": sites,
        "clickBehavior": clickBehavior,
        "contextMenuClickBehavior": contextMenuClickBehavior,
        "defaultFormat": defaultFormat,
        "advancedSettings": advancedSettings
    }, function () {
        document.getElementById("saved").classList.remove('hidden');

        setTimeout(function () {
            document.getElementById("saved").classList.add('hidden');
        }, 1000 * 10)
    });

    sites = splitLines(sites);

    // todo: fix it
    // also need make function for check string
    // https://developer.chrome.com/docs/extensions/mv3/match_patterns/
    if(!sites.length){
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
    chrome.storage.sync.get([
        'metube',
        'sites',
        'clickBehavior',
        'contextMenuClickBehavior',
        'defaultFormat',
        'advancedSettings'
    ], function (data) {
        if (data.metube !== undefined) {
            document.getElementById("metube").value = data.metube;
        }

        if (data.sites !== undefined) {
            document.getElementById("additional").value = data.sites;
        }

        if (data.clickBehavior !== undefined) {
            document.getElementById(data.clickBehavior).checked = true;
        }

        if (data.contextMenuClickBehavior !== undefined) {
            document.getElementById(data.contextMenuClickBehavior).checked = true;
        }

        if (data.defaultFormat !== undefined) {
            document.getElementById('default_format').value = data.defaultFormat;
        }

        if (data.advancedSettings !== undefined) {
          Object.keys(data.advancedSettings).forEach((key) => {
            document.getElementById(key).checked = data.advancedSettings[key];
          })
        }
    })
}

function splitLines(t) { return t.split(/\r\n|\r|\n/); }

window.addEventListener("DOMContentLoaded", restoreOptions, { passive: true });

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveOptions();
}, { passive: false });
