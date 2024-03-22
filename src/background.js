// 'use strict';
chrome.runtime.onInstalled.addListener(function () {
    // https://stackoverflow.com/questions/19377262/regex-for-youtube-url
    chrome.contextMenus.create({
        id: 'metube',
        title: "Send to MeTube",
        targetUrlPatterns: [
            'https://www.youtube.com/*',
            'https://m.youtube.com/*',
            'https://youtu.be/*'
        ],
        contexts: ['link'],
    });
});

function sendVideoUrlToMetube(videoUrl, metubeUrl, format, advancedSettings, callback) {
    console.log("Sending videoUrl=" + videoUrl + " to metubeUrl=" + metubeUrl);

    if (typeof callback !== 'function') {
        callback = function () {
        };
    }

    let {hostname} = new URL(videoUrl)

    let postData = {
      "quality": "best",
      "format": format,
      "url": videoUrl,
      'auto_start': !advancedSettings['disable_auto_start']
    }


    Object.keys(advancedSettings).forEach((key) => {
      if (advancedSettings[key] && !['disable_auto_start'].includes(key) ) {
        postData[key] = hostname.startsWith('www.') ? hostname.replace('www.', '') : hostname
      }
    })

    console.log(postData)
    fetch(metubeUrl + "/add", {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
        .then(response => response.json())
        .then(function (response) {
            if (response.status === 'ok') {
                callback();
            }
        })
        .catch(e => console.log("Ran into an unexpected error: " + e));
}

chrome.contextMenus.onClicked.addListener(function (item, tab) {
    chrome.storage.sync.get(['metube', 'contextMenuClickBehavior', 'defaultFormat', 'advancedSettings'], function (data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }

        let needToSwitch = (data.contextMenuClickBehavior === 'context-menu-send-current-url-and-switch');

        sendVideoUrlToMetube(item.linkUrl, data.metube, data.defaultFormat, data.advancedSettings, function () {
            if (needToSwitch) {
                openTab(data.metube, tab);
            }
        });
    });
});

chrome.action.onClicked.addListener(function (tab) {
    chrome.storage.sync.get(['metube', 'clickBehavior', 'defaultFormat', 'advancedSettings'], function (data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }

        if (data.clickBehavior === 'go-to-metube') {
            openTab(data.metube, tab);
            return;
        }

        let needToSwitch = (data.clickBehavior === 'send-current-url-and-switch');

        chrome.tabs.query({
            active: true,
            lastFocusedWindow: true
        }, function (tabs) {
            // use this tab to get the youtube video URL
            let videoUrl = tabs[0].url;
            sendVideoUrlToMetube(videoUrl, data.metube, data.defaultFormat, data.advancedSettings, function () {
                if (needToSwitch) {
                    openTab(data.metube, tab);
                }
            });
        });
    });
});

function openTab(url, currentTab) {
    chrome.tabs.query({
        url: url + "/*"
    }, function (tabs) {
        if (tabs.length !== 0) {
            chrome.tabs.update(tabs[0].id, {
                'active': true
            }, () => {
            });
        } else {
            chrome.tabs.create({
                url: url,
                index: currentTab.index + 1
            });
        }
    });
}
