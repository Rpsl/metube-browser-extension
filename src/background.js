// 'use strict';
chrome.runtime.onInstalled.addListener(function() {
    // https://stackoverflow.com/questions/19377262/regex-for-youtube-url
    chrome.contextMenus.create({
        id: 'metube',
        title: "Send to MeTube",
        targetUrlPatterns: [
            'https://xnxx.com/*',
            'https://www.xnxx.com/*',
            'http://www.alphaporno.com/*',
            'http://beeg.com/*',
            'https://beeg.com/*',
            'https://beeg.porn/*',
            'http://www.behindkink.com/*',
            'http://www.porntrex.com/*',
            'http://www.cracked.com/*',
            'https://www.crackle.com/*',
            'http://www.crunchyroll.fr/*',
            'https://www.crunchyroll.com/*',
            'https://xhamster.com/*',
            'https://xvideos.com/*',
            'https://redtube.com/*',
            'https://pornhub.com/*',
            'https://spankbang.com/*',
            'https://youporn.com/*',
            'https://incestflix.com/*',
            'https://pornbimbo.com/*',
            'https://rule43.com/*',
            'https://freeuseporn.com/*',
            'https://tubesafari.com/*',
            'https://www.freeuseporn.org/*',
            'https://incestflix.com/*',
            'https://freeusex.com/*',
            'https://www.xhamster.com/*',
            'https://www.xvideos.com/*',
            'https://www.redtube.com/*',
            'https://www.pornhub.com/*',
            'https://www.spankbang.com/*',
            'https://www.youporn.com/*',
            'https://www.incestflix.com/*',
            'https://www.pornbimbo.com/*',
            'https://www.rule43.com/*',
            'https://www.freeuseporn.com/*',
            'https://www.tubesafari.com/*',
            'https://www.freeuseporn.org/*',
            'https://www.incestflix.com/*',
            'https://www.freeusex.com/*',
            'http://www.crunchyroll.com/*',
            'http://www.dailymail.co.uk/*',
            'http://digg.com/*',
            'https://www.ultimedia.com/*',
            'https://www.digiteka.net/*',
            'http://www.ultimedia.com/*',
            'https://www.investigationdiscovery.com/*',
            'https://go.discovery.com/*',
            'https://www.sciencechannel.com/*',
            'https://api.discovery.com/*',
            'https://www.discovery.com/*',
            'https://www.discoverygo.com/*',
            'https://www.tlc.de/*',
            'https://tlc.de/*',
            'http://www.discoveryvr.com/*',
            'http://video.disney.com/*',
            'https://www.eporner.com/*',
            'https://cdn.espn.go.com/*',
            'https://espn.go.com/*',
            'http://www.espnfc.us/*',
            'http://www.espnfc.com/*',
            'http://www.espn.com/*',
            'http://api-app.espn.com/*',
            'http://espn.go.com/*',
            'https://m.facebook.com/*',
            'https://developers.facebook.com/*',
            'https://www.facebook.com/*',
            'https://www.porntube.com/*',
            'https://m.porntube.com/*',
            'https://www.pornerbros.com/*',
            'https://m.pornerbros.com/*',
            'https://www.fox.com/*',
            'http://www.eporner.com/*',
            'http://4shared.com/*',
            'http://instagram.com/*',
            'http://facebook.com/*',
            'http://m.facebook.com/*',
            'http://www.facebook.com/*',
            'http://Gov.sg/*',
            'http://faz.net/*',
            'http://dl.org/*',
            'http://token.4tube.com/*',
            'http://token.fux.com/*',
            'http://tkn.porntube.com/*',
            'http://token.pornerbros.com/*',
            'http://Foxgay.com/*',
            'http://foxgay.com/*'

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
