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

function sendVideoUrlToMetube(videoUrl, metubeUrl, callback) {
    console.log("Sending videoUrl=" + videoUrl + " to metubeUrl=" + metubeUrl);

    if (typeof callback !== 'function') {
        callback = function () {
        };
    }

    fetch(metubeUrl + "/add", {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "quality": "best",
            "url": videoUrl
        })
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
    chrome.storage.sync.get(['metube', 'contextMenuClickBehavior'], function (data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }

        let needToSwitch = (data.contextMenuClickBehavior === 'context-menu-send-current-url-and-switch');

        sendVideoUrlToMetube(item.linkUrl, data.metube, function () {
            if (needToSwitch) {
                openTab(data.metube, tab);
            }
        });
    });
});

chrome.action.onClicked.addListener(function (tab) {
    chrome.storage.sync.get(['metube', 'clickBehavior'], function (data) {
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
            sendVideoUrlToMetube(videoUrl, data.metube, function () {
                if (!needToSwitch) {
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
