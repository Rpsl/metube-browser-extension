importScripts("common.js");

const shared = MetubeShared;

function reportChromeError(operation) {
    const error = chrome.runtime.lastError;
    if (error) console.error(`MeTube: ${operation} failed: ${error.message}`);
}

function createContextMenu(patterns) {
    chrome.contextMenus.create(
        {
            id: "metube",
            title: "Send to MeTube",
            targetUrlPatterns: patterns,
            contexts: ["link"],
        },
        () => reportChromeError("context-menu creation"),
    );
}

async function reconcileContextMenu() {
    let configuration;
    try {
        configuration = await shared.loadConfiguration();
    } catch (error) {
        console.error(
            "MeTube: could not load configuration for context menu:",
            error,
        );
        configuration = shared.DEFAULT_CONFIGURATION;
    }
    const patterns = [
        ...new Set([
            ...shared.DEFAULT_TARGET_URL_PATTERNS,
            ...configuration.sites,
        ]),
    ];
    chrome.contextMenus.update(
        "metube",
        { targetUrlPatterns: patterns },
        () => {
            const error = chrome.runtime.lastError;
            if (!error) return;
            if (
                /cannot find|could not find|not found|no menu item|does not exist/i.test(
                    error.message,
                )
            ) {
                createContextMenu(patterns);
                return;
            }
            console.error(
                `MeTube: context-menu update failed: ${error.message}`,
            );
        },
    );
}

chrome.runtime.onInstalled.addListener(() => {
    reconcileContextMenu();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && Object.hasOwn(changes, shared.CONFIG_KEY)) {
        reconcileContextMenu();
    }
});

function resolveChoice(choice, requested) {
    if (!choice) return null;
    return choice.options.some((option) => option.id === requested)
        ? requested
        : choice.default;
}

function buildDownloadPayload(videoUrl, configuration, catalog) {
    const saved = configuration.downloadOptions;
    const typeChoice = catalog.download_type;
    const typeId = resolveChoice(typeChoice, saved.downloadType);
    const type = typeChoice.options.find((option) => option.id === typeId);
    const formatId = resolveChoice(type.format, saved.format);
    const format = type.format.options.find((option) => option.id === formatId);
    const enabled = saved.enabled;
    const payload = {
        url: videoUrl,
        download_type: typeId,
        format: formatId,
        quality:
            enabled && format.quality
                ? resolveChoice(format.quality, saved.quality)
                : "best",
        auto_start: !configuration.advancedSettings.disable_auto_start,
    };

    if (enabled) {
        for (const [fieldName, choice] of Object.entries(type)) {
            if (["id", "text", "format"].includes(fieldName)) continue;
            const value = resolveChoice(choice, saved.fields[fieldName]);
            if (value !== null) payload[fieldName] = value;
        }
    }

    let hostname;
    try {
        hostname = new URL(videoUrl).hostname.replace(/^www\./, "");
    } catch (_error) {
        hostname = "";
    }
    if (hostname) {
        if (configuration.advancedSettings.folder) payload.folder = hostname;
        if (configuration.advancedSettings.custom_name_prefix)
            payload.custom_name_prefix = hostname;
    }
    return payload;
}

async function sendVideoUrlToMetube(videoUrl, configuration, onSuccess) {
    let catalog;
    try {
        catalog = await shared.loadCatalogForUrl(configuration.metubeUrl);
    } catch (error) {
        console.error(`MeTube: ${error.message}`);
        chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
        return;
    }
    const postData = buildDownloadPayload(videoUrl, configuration, catalog);
    try {
        const response = await fetch(
            shared.endpointUrl(configuration.metubeUrl, "add"),
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postData),
            },
        );
        if (!response.ok)
            throw new Error(
                `MeTube returned HTTP ${response.status} while adding the download.`,
            );
        const result = await response.json();
        if (result.status === "ok") {
            onSuccess?.();
        } else {
            console.error("MeTube: download request was not accepted:", result);
        }
    } catch (error) {
        console.error("MeTube: failed to send download request:", error);
    }
}

async function readConfigurationOrOpenOptions(tab) {
    try {
        const configuration = await shared.loadConfiguration();
        if (!configuration.metubeUrl) {
            openTab(chrome.runtime.getURL("options.html"), tab);
            return null;
        }
        return configuration;
    } catch (error) {
        console.error("MeTube: could not load configuration:", error);
        openTab(chrome.runtime.getURL("options.html"), tab);
        return null;
    }
}

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
    const configuration = await readConfigurationOrOpenOptions(tab);
    if (!configuration) return;
    const shouldSwitch =
        configuration.contextMenuClickBehavior ===
        "context-menu-send-current-url-and-switch";
    await sendVideoUrlToMetube(item.linkUrl, configuration, () => {
        if (shouldSwitch) openTab(configuration.metubeUrl, tab);
    });
});

chrome.action.onClicked.addListener(async (tab) => {
    const configuration = await readConfigurationOrOpenOptions(tab);
    if (!configuration) return;
    if (configuration.clickBehavior === "go-to-metube") {
        openTab(configuration.metubeUrl, tab);
        return;
    }
    const shouldSwitch =
        configuration.clickBehavior === "send-current-url-and-switch";
    chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        async (tabs) => {
            const error = chrome.runtime.lastError;
            if (error) {
                console.error(
                    `MeTube: could not read the active tab: ${error.message}`,
                );
                return;
            }
            const videoUrl = tabs[0]?.url;
            if (!videoUrl) {
                console.error("MeTube: the active tab has no URL to download.");
                return;
            }
            await sendVideoUrlToMetube(videoUrl, configuration, () => {
                if (shouldSwitch) openTab(configuration.metubeUrl, tab);
            });
        },
    );
});

function openTab(url, currentTab) {
    chrome.tabs.query({ url: `${url}/*` }, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error)
            console.error(
                `MeTube: could not find an open instance tab: ${error.message}`,
            );
        if (tabs?.length) {
            chrome.tabs.update(tabs[0].id, { active: true }, () =>
                reportChromeError("tab activation"),
            );
        } else {
            chrome.tabs.create(
                {
                    url,
                    ...(Number.isInteger(currentTab?.index)
                        ? { index: currentTab.index + 1 }
                        : {}),
                },
                () => reportChromeError("tab creation"),
            );
        }
    });
}
