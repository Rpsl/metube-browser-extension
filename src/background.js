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

function sendVideoUrlToMetube(videoUrl, metubeUrl, callback) {
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
        console.log("error :: code" + res.status);
    }).then(function(result) {
        if (result.status !== "ok") {
            console.log("error :: ", result );
            if (result.msg.includes('URLError')) {
                // Go straight to catch block and skip the callback
                throw new Error('Error when adding URL to MyTube');
            }
        }
    }).then(function() {
        if (typeof callback === 'function'){
            callback();
        }
    }).catch(function(e) {
        console.log("Ran into an error :: ", e);
    });
}

chrome.contextMenus.onClicked.addListener(function(item, tab) {
    chrome.storage.sync.get(['metube', 'contextMenuClickBehavior'], function(data) {
        if (data === undefined || !data.hasOwnProperty('metube') || data.metube === "") {
            openTab(chrome.runtime.getURL('options.html'), tab);
            return
        }
        if ( data.contextMenuClickBehavior == 'context-menu-send-current-url') {
            sendVideoUrlToMetube(item.linkUrl, data.metube);
        } else if (data.contextMenuClickBehavior == 'context-menu-send-current-url-and-switch'){
            sendVideoUrlToMetube(item.linkUrl, data.metube, function() {
                openTab(data.metube, tab);
            });
        } else {
            console.log("Unknown contextMenuClickBehavior value: " + data.contextMenuClickBehavior);
        }
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
        } else if (data.clickBehavior == 'send-current-url') {
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, function(tabs) {
                // use this tab to get the youtube video URL
                let videoUrl = tabs[0].url;
                sendVideoUrlToMetube(videoUrl, data.metube);
            });
        } else if (data.clickBehavior == 'send-current-url-and-switch') {
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, function(tabs) {
                // use this tab to get the youtube video URL
                let videoUrl = tabs[0].url;
                sendVideoUrlToMetube(videoUrl, data.metube, function() {
                    openTab(data.metube, tab);
                });
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
