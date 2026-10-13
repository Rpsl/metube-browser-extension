const shared = MetubeShared;
const urlForm = document.getElementById("metube-url-form");
const settingsForm = document.getElementById("settings-form");
const urlInput = document.getElementById("metube");
const urlStatus = document.getElementById("url-status");
const optionsContainer = document.getElementById("download-options");
let configuration = null;

let savedMessageTimer = null;

function showUrlMessage(message, isError = false) {
    urlStatus.textContent = message;
    urlStatus.className = message
        ? isError
            ? "status-error"
            : "status-success"
        : "";
}

function setSelectValue(select, choice, savedValue) {
    const available = choice.options.some((option) => option.id === savedValue);
    select.value = available ? savedValue : choice.default;
}

function addChoiceField(container, name, labelText, choice, savedValue, gated) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const label = document.createElement("label");
    const select = document.createElement("select");
    select.name = name;
    select.id = `download-${name}`;
    label.htmlFor = select.id;
    label.textContent = labelText;
    for (const optionData of choice.options) {
        const option = document.createElement("option");
        option.value = optionData.id;
        option.textContent = optionData.text;
        select.append(option);
    }
    setSelectValue(select, choice, savedValue);
    select.disabled =
        gated && !document.getElementById("set-download-options").checked;
    wrapper.append(label, select);
    container.append(wrapper);
    return select;
}

function getCurrentDownloadOptions() {
    const fields = Object.create(null);
    optionsContainer
        .querySelectorAll("select[data-optional-field]")
        .forEach((select) => {
            if (select.dataset.optionalField !== "quality") {
                fields[select.dataset.optionalField] = select.value;
            }
        });
    return {
        enabled: document.getElementById("set-download-options").checked,
        downloadType:
            document.getElementById("download-download_type")?.value || "",
        format: document.getElementById("download-format")?.value || "",
        quality: document.getElementById("download-quality")?.value || "best",
        fields,
    };
}

function renderDownloadOptions(catalog, saved = configuration.downloadOptions) {
    optionsContainer.replaceChildren();
    const typeSelect = addChoiceField(
        optionsContainer,
        "download_type",
        "Download type",
        catalog.download_type,
        saved.downloadType,
        false,
    );

    const renderTypeFields = (typeValue, requestedFormat, selections) => {
        optionsContainer
            .querySelectorAll(".dependent-field")
            .forEach((element) => element.remove());
        const type = catalog.download_type.options.find(
            (option) => option.id === typeValue,
        );
        if (!type) return;
        const dependent = document.createElement("div");
        dependent.className = "dependent-field";
        const formatSelect = addChoiceField(
            dependent,
            "format",
            "Format",
            type.format,
            requestedFormat,
            false,
        );
        formatSelect.id = "download-format";

        const renderFormatFields = (formatValue, choices) => {
            dependent
                .querySelectorAll(".format-dependent-field")
                .forEach((element) => element.remove());
            const format = type.format.options.find(
                (option) => option.id === formatValue,
            );
            if (!format) return;
            const formatFields = document.createElement("div");
            formatFields.className = "format-dependent-field";
            if (format.quality) {
                const qualitySelect = addChoiceField(
                    formatFields,
                    "quality",
                    "Quality",
                    format.quality,
                    choices.quality,
                    true,
                );
                qualitySelect.dataset.optionalField = "quality";
            }
            for (const [key, choice] of Object.entries(type)) {
                if (["id", "text", "format"].includes(key)) continue;
                const fieldSelect = addChoiceField(
                    formatFields,
                    key,
                    key
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
                    choice,
                    choices.fields?.[key],
                    true,
                );
                fieldSelect.dataset.optionalField = key;
            }
            dependent.append(formatFields);
        };

        renderFormatFields(formatSelect.value, selections);
        optionsContainer.append(dependent);
        formatSelect.addEventListener("change", () =>
            renderFormatFields(formatSelect.value, getCurrentDownloadOptions()),
        );
    };

    typeSelect.addEventListener("change", () => {
        const current = getCurrentDownloadOptions();
        renderTypeFields(typeSelect.value, current.format, current);
    });
    renderTypeFields(typeSelect.value, saved.format, saved);
    document.getElementById("set-download-options").checked = saved.enabled;
    syncGatedFields();
}

function syncGatedFields() {
    const enabled = document.getElementById("set-download-options").checked;
    optionsContainer
        .querySelectorAll("select[data-optional-field]")
        .forEach((select) => {
            select.disabled = !enabled;
        });
}

document
    .getElementById("set-download-options")
    .addEventListener("change", syncGatedFields);

function populateExistingSettings(config) {
    document.querySelector(
        `input[name="click-behavior"][value="${config.clickBehavior}"]`,
    ).checked = true;
    document.querySelector(
        `input[name="context-menu-click-behavior"][value="${config.contextMenuClickBehavior}"]`,
    ).checked = true;
    for (const [key, enabled] of Object.entries(config.advancedSettings)) {
        document.getElementById(key).checked = enabled;
    }
    document.getElementById("additional").value = config.sites.join("\n");
}

function showSettings(catalog) {
    renderDownloadOptions(catalog);
    populateExistingSettings(configuration);
    settingsForm.classList.remove("hidden");
}

async function loadOptions() {
    try {
        configuration = await shared.loadConfiguration();
        urlInput.value = configuration.metubeUrl;
        if (!configuration.metubeUrl) return;
        const catalog = await shared.fetchCatalog(configuration.metubeUrl);
        await shared.saveCatalog(configuration.metubeUrl, catalog);
        showUrlMessage("");
        showSettings(catalog);
    } catch (error) {
        settingsForm.classList.add("hidden");
        showUrlMessage(error.message || "Unable to load MeTube options.", true);
        if (!configuration) {
            try {
                configuration = await shared.loadConfiguration();
            } catch (_loadError) {
                /* keep the actionable original error */
            }
        }
        if (configuration?.metubeUrl) urlInput.value = configuration.metubeUrl;
    }
}

urlForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showUrlMessage("Loading MeTube options…");
    settingsForm.classList.add("hidden");
    try {
        const normalizedUrl = shared.normalizeMetubeUrl(urlInput.value);
        const catalog = await shared.fetchCatalog(normalizedUrl);
        await shared.saveCatalog(normalizedUrl, catalog);
        const previousConfiguration =
            configuration || (await shared.loadConfiguration());
        const nextConfiguration = {
            ...previousConfiguration,
            metubeUrl: normalizedUrl,
        };
        try {
            configuration = await shared.saveConfiguration(nextConfiguration);
        } catch (error) {
            showUrlMessage(
                `Could not save the MeTube configuration: ${error.message}`,
                true,
            );
            return;
        }
        urlInput.value = normalizedUrl;
        showUrlMessage("");
        showSettings(catalog);
    } catch (error) {
        showUrlMessage(error.message || "Unable to load MeTube options.", true);
    }
});

settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const siteResult = shared.filterValidSites(
        document.getElementById("additional").value,
    );
    const sitesStatus = document.getElementById("sites-status");
    sitesStatus.textContent = siteResult.invalid.length
        ? `Ignored invalid patterns: ${siteResult.invalid.join(", ")}`
        : "";
    sitesStatus.className = siteResult.invalid.length ? "status-error" : "";
    document.getElementById("additional").value = siteResult.valid.join("\n");

    const advancedSettings = {};
    document.querySelectorAll("#advanced_settings input").forEach((input) => {
        advancedSettings[input.name] = input.checked;
    });
    const next = {
        ...configuration,
        downloadOptions: getCurrentDownloadOptions(),
        clickBehavior: document.querySelector(
            'input[name="click-behavior"]:checked',
        ).value,
        contextMenuClickBehavior: document.querySelector(
            'input[name="context-menu-click-behavior"]:checked',
        ).value,
        advancedSettings,
        sites: siteResult.valid,
    };
    try {
        configuration = await shared.saveConfiguration(next);
        document.getElementById("settings-error").textContent = "";
        const saved = document.getElementById("saved");
        saved.classList.remove("hidden");
        clearTimeout(savedMessageTimer);
        savedMessageTimer = setTimeout(
            () => saved.classList.add("hidden"),
            10000,
        );
    } catch (error) {
        document.getElementById("settings-error").textContent =
            `Could not save settings: ${error.message}`;
    }
});

window.addEventListener("DOMContentLoaded", loadOptions, { once: true });
