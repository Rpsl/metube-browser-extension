'use strict';

chrome.runtime.onInstalled.addListener(function () {
    // https://stackoverflow.com/questions/19377262/regex-for-youtube-url
    chrome.contextMenus.create({
        id: 'metube',
        title: "Send to MeTube",
        documentUrlPatterns: [
            'https://www.youtube.com/*',
            'https://m.youtube.com/*',
            'https://youtu.be/*'
        ],
        contexts: ['link'],
    });
});

chrome.contextMenus.onClicked.addListener(function (item, tab) {
    chrome.storage.sync.get(['metube'], function (data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.extension.getURL('options.html'), tab);
            return
        }

        let url = data.metube;
        let xhr = new XMLHttpRequest();
        xhr.open("POST", url + "/add", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                let json = JSON.parse(xhr.responseText);
                if (json.status === "ok") {
                    openTab(data.metube, tab);
                } else {
                    alert("error :: " + json);
                }
            }
        };
        xhr.send(JSON.stringify({"quality": "best", "url": item.linkUrl}));
    });
});

chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.storage.sync.get(['metube'], function (data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.extension.getURL('options.html'), tab);
            return
        }

        openTab(data.metube, tab);
    });
});

function openTab(url, currentTab) {
    chrome.tabs.query({url: url + "/*"}, function (tabs) {
        if (tabs.length !== 0) {
            chrome.tabs.update(tabs[0].id, {'active': true}, () => {});
        } else {
            chrome.tabs.create({url: url, index: currentTab.index + 1});
        }
    });
}