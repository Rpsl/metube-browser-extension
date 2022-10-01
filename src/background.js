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

function sendVideoUrlToMetubeAndSwitchTab(videoUrl, metubeUrl, tab) {
    console.log("Sending videoUrl=" + videoUrl + " to metubeUrl=" + metubeUrl);
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
    }).then(function(res) {
        if (res.ok === true && res.status === 200) {
            return res.json();
        }
        console.log("error :: code " + res.status);
    }).then(function(result) {
        if (result.status === "ok") {
            openTab(metubeUrl, tab);
        } else {
            console.log("error :: ", result );
        }
    }).catch(function(res) {
        console.log("Final catch - error :: " + res);
    });
}

chrome.contextMenus.onClicked.addListener(function(item, tab) {
    chrome.storage.sync.get(['metube'], function(data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }
        sendVideoUrlToMetubeAndSwitchTab(item.linkUrl, data.metube, tab);
    });
});

chrome.action.onClicked.addListener(function(tab) {
    chrome.storage.sync.get(['metube', 'clickBehavior'], function(data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }
        if (data.clickBehavior == 'do-nothing') {
            return
        } else if (data.clickBehavior == 'go-to-metube') {
            console.log("Going to Metube URL...");
            openTab(data.metube, tab);
        } else if (data.clickBehavior == 'send-current-url-and-switch') {
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, function(tabs) {
                // use this tab to get the youtube video URL
                let videoUrl = tabs[0].url;
                sendVideoUrlToMetubeAndSwitchTab(videoUrl, data.metube, tab);
            });
        } else {
            console.log("Unknown clickBehavior value: " + data.clickBehavior);
        }
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
