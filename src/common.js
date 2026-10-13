(() => {
    const CONFIG_KEY = "configuration";
    const FORMAT_CACHE_KEY = "metubeFormatCache";
    const DEFAULT_TARGET_URL_PATTERNS = Object.freeze([
        "https://www.youtube.com/*",
        "https://m.youtube.com/*",
        "https://youtu.be/*",
    ]);

    const DEFAULT_CONFIGURATION = Object.freeze({
        metubeUrl: "",
        downloadOptions: Object.freeze({
            enabled: false,
            downloadType: "",
            format: "",
            quality: "best",
            fields: Object.freeze({}),
        }),
        clickBehavior: "go-to-metube",
        contextMenuClickBehavior: "context-menu-send-current-url",
        advancedSettings: Object.freeze({
            folder: false,
            custom_name_prefix: false,
            disable_auto_start: false,
        }),
        sites: Object.freeze([]),
    });

    function normalizeMetubeUrl(value) {
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error("Enter a MeTube URL.");
        }
        let input = value.trim();
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) {
            input = `http://${input.replace(/^\/+/, "")}`;
        }
        let url;
        try {
            url = new URL(input);
        } catch (_error) {
            throw new Error("Enter a valid MeTube URL.");
        }
        if (
            !["http:", "https:"].includes(url.protocol) ||
            !url.hostname ||
            url.username ||
            url.password
        ) {
            throw new Error(
                "MeTube URL must be an HTTP or HTTPS address with a host.",
            );
        }
        url.pathname = url.pathname.replace(/\/+$/, "");
        url.hash = "";
        return url.href.replace(/\/$/, "");
    }

    function splitLines(text) {
        return text
            .split(/\r\n|\r|\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    function isValidHostPattern(authority) {
        if (authority === "*") return true;
        let host = authority;
        if (host.startsWith("*.")) host = host.slice(2);
        if (
            host.includes(":") ||
            host.includes("*") ||
            host.startsWith(".") ||
            host.endsWith(".")
        )
            return false;
        return /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/.test(
            host,
        );
    }

    function isValidMatchPattern(pattern) {
        if (typeof pattern !== "string") return false;
        if (pattern === "<all_urls>") return true;
        const match = pattern.match(/^(\*|https?|file):\/\/([^/]*)(\/.*)$/);
        if (!match) return false;
        const [, scheme, authority, path] = match;
        if (!path || !path.startsWith("/")) return false;
        if (scheme === "file") return authority === "";
        if (authority === "") return false;
        return isValidHostPattern(authority);
    }

    function filterValidSites(value) {
        const lines = Array.isArray(value)
            ? value
                  .filter((line) => typeof line === "string")
                  .flatMap(splitLines)
            : typeof value === "string"
              ? splitLines(value)
              : [];
        const valid = [];
        const invalid = [];
        for (const line of lines) {
            if (isValidMatchPattern(line)) valid.push(line);
            else invalid.push(line);
        }
        return { valid: [...new Set(valid)], invalid };
    }

    function isChoice(value) {
        if (
            !value ||
            typeof value !== "object" ||
            !Array.isArray(value.options) ||
            value.options.length === 0 ||
            typeof value.default !== "string"
        ) {
            return false;
        }
        const ids = new Set();
        for (const option of value.options) {
            if (
                !option ||
                typeof option !== "object" ||
                typeof option.id !== "string" ||
                option.id.length === 0 ||
                typeof option.text !== "string" ||
                ids.has(option.id)
            ) {
                return false;
            }
            ids.add(option.id);
        }
        return ids.has(value.default);
    }

    function validateCatalog(catalog) {
        if (
            !catalog ||
            typeof catalog !== "object" ||
            Array.isArray(catalog) ||
            !isChoice(catalog.download_type)
        ) {
            throw new Error(
                "MeTube returned an invalid download-options catalog.",
            );
        }
        for (const type of catalog.download_type.options) {
            if (!isChoice(type.format))
                throw new Error("MeTube returned an invalid format choice.");
            for (const [key, field] of Object.entries(type)) {
                if (["id", "text", "format"].includes(key)) continue;
                if (!isChoice(field))
                    throw new Error(
                        `MeTube returned an invalid ${key} choice.`,
                    );
            }
            for (const format of type.format.options) {
                if (
                    Object.hasOwn(format, "quality") &&
                    !isChoice(format.quality)
                ) {
                    throw new Error(
                        "MeTube returned an invalid quality choice.",
                    );
                }
                if (
                    Object.hasOwn(format, "tags") &&
                    typeof format.tags !== "boolean"
                ) {
                    throw new Error("MeTube returned invalid format metadata.");
                }
                for (const key of Object.keys(format)) {
                    if (!["id", "text", "quality", "tags"].includes(key)) {
                        throw new Error(
                            `MeTube returned unexpected format metadata: ${key}.`,
                        );
                    }
                }
            }
        }
        return catalog;
    }

    function validString(value, allowed, fallback) {
        return allowed.includes(value) ? value : fallback;
    }

    function validateConfiguration(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Saved MeTube configuration is invalid.");
        }
        let metubeUrl = "";
        if (value.metubeUrl) metubeUrl = normalizeMetubeUrl(value.metubeUrl);
        const options = value.downloadOptions;
        if (
            !options ||
            typeof options !== "object" ||
            Array.isArray(options) ||
            typeof options.enabled !== "boolean" ||
            typeof options.downloadType !== "string" ||
            typeof options.format !== "string" ||
            typeof options.quality !== "string" ||
            !options.fields ||
            typeof options.fields !== "object" ||
            Array.isArray(options.fields) ||
            Object.values(options.fields).some(
                (field) => typeof field !== "string",
            )
        ) {
            throw new Error("Saved download options are invalid.");
        }
        const advanced = value.advancedSettings;
        if (
            !advanced ||
            typeof advanced !== "object" ||
            ["folder", "custom_name_prefix", "disable_auto_start"].some(
                (key) => typeof advanced[key] !== "boolean",
            )
        ) {
            throw new Error("Saved advanced settings are invalid.");
        }
        const sites = filterValidSites(value.sites).valid;
        return {
            metubeUrl,
            downloadOptions: {
                enabled: options.enabled,
                downloadType: options.downloadType,
                format: options.format,
                quality: options.quality,
                fields: { ...options.fields },
            },
            clickBehavior: validString(
                value.clickBehavior,
                [
                    "go-to-metube",
                    "send-current-url",
                    "send-current-url-and-switch",
                ],
                DEFAULT_CONFIGURATION.clickBehavior,
            ),
            contextMenuClickBehavior: validString(
                value.contextMenuClickBehavior,
                [
                    "context-menu-send-current-url",
                    "context-menu-send-current-url-and-switch",
                ],
                DEFAULT_CONFIGURATION.contextMenuClickBehavior,
            ),
            advancedSettings: {
                folder: advanced.folder,
                custom_name_prefix: advanced.custom_name_prefix,
                disable_auto_start: advanced.disable_auto_start,
            },
            sites,
        };
    }

    function storageGet(area, keys) {
        return new Promise((resolve, reject) => {
            area.get(keys, (result) => {
                const error = chrome.runtime.lastError;
                if (error) reject(new Error(error.message));
                else resolve(result);
            });
        });
    }

    function storageSet(area, values) {
        return new Promise((resolve, reject) => {
            area.set(values, () => {
                const error = chrome.runtime.lastError;
                if (error) reject(new Error(error.message));
                else resolve();
            });
        });
    }

    async function loadConfiguration() {
        const stored = await storageGet(chrome.storage.sync, CONFIG_KEY);
        if (!Object.hasOwn(stored, CONFIG_KEY))
            return structuredClone(DEFAULT_CONFIGURATION);
        return validateConfiguration(stored[CONFIG_KEY]);
    }

    async function saveConfiguration(configuration) {
        const validated = validateConfiguration(configuration);
        await storageSet(chrome.storage.sync, { [CONFIG_KEY]: validated });
        return validated;
    }

    function endpointUrl(base, endpoint) {
        const url = new URL(base);
        url.pathname = `${url.pathname.replace(/\/+$/, "")}/${endpoint}`;
        return url.href;
    }

    async function fetchCatalog(base) {
        const response = await fetch(endpointUrl(base, "formats"));
        if (!response.ok)
            throw new Error(
                `MeTube returned HTTP ${response.status} while loading download options.`,
            );
        let catalog;
        try {
            catalog = await response.json();
        } catch (_error) {
            throw new Error(
                "MeTube returned a non-JSON download-options response.",
            );
        }
        return validateCatalog(catalog);
    }

    async function saveCatalog(base, catalog) {
        const validated = validateCatalog(catalog);
        await storageSet(chrome.storage.local, {
            [FORMAT_CACHE_KEY]: { url: base, catalog: validated },
        });
    }

    async function loadCatalogForUrl(base) {
        const stored = await storageGet(chrome.storage.local, FORMAT_CACHE_KEY);
        const cache = stored[FORMAT_CACHE_KEY];
        if (!cache || cache.url !== base) {
            throw new Error(
                "MeTube download options are missing or out of date. Reload options before downloading.",
            );
        }
        try {
            return validateCatalog(cache.catalog);
        } catch (_error) {
            throw new Error(
                "The cached MeTube options are invalid. Reload options before downloading.",
            );
        }
    }

    globalThis.MetubeShared = Object.freeze({
        CONFIG_KEY,
        FORMAT_CACHE_KEY,
        DEFAULT_CONFIGURATION,
        DEFAULT_TARGET_URL_PATTERNS,
        normalizeMetubeUrl,
        filterValidSites,
        isValidMatchPattern,
        validateCatalog,
        validateConfiguration,
        loadConfiguration,
        saveConfiguration,
        fetchCatalog,
        saveCatalog,
        loadCatalogForUrl,
        endpointUrl,
    });
})();
