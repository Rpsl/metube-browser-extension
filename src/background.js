// 'use strict';
chrome.runtime.onInstalled.addListener(function() {
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

chrome.contextMenus.onClicked.addListener(function(item, tab) {
    chrome.storage.sync.get(['metube'], function(data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }

        fetch(data.metube + "/add", {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "quality": "best",
                    "url": item.linkUrl
                })
            })
            .then(function(res) {
                if (res.ok === true && res.status === 200) {
                    return res.json();
                }
                // todo fix it
                alert("error :: code " + res.status);
            })
            .then(function(result) {
                if (result.status === "ok") {
                    openTab(data.metube, tab);
                } else {
                    // todo fix it
                    alert("error :: " + json);
                }
            })
            .catch(function(res) {
                alert("error :: " + res);
            })
    });
});

chrome.action.onClicked.addListener(function(tab) {
    chrome.storage.sync.get(['metube'], function(data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }

        openTab(data.metube, tab);
    });
});

function openTab(url, currentTab) {
    chrome.tabs.query({
        url: url + "/*"
    }, function(tabs) {
        if (tabs.length !== 0) {
            chrome.tabs.update(tabs[0].id, {
                'active': true
            }, () => {});
        } else {
            chrome.tabs.create({
                url: url,
                index: currentTab.index + 1
            });
        }
    });
}
