/**
 * visualizations.js - CODAP launcher, Desmos table/list clipboard integration, and Slow Reveal Graph
 */

// Generate CODAP URL wrapping custom plugin with CSV and variable parameters
function generateCodapUrl({ csvUrl, xColumn, yColumn, title }) {
    const pluginBase = "https://danielflim.github.io/plugin.html";

    // Build the plugin query string
    const pluginParams = new URLSearchParams({
        csv: csvUrl,
        title: title || "Dataset"
    });
    if (xColumn) pluginParams.append("x", xColumn);
    if (yColumn) pluginParams.append("y", yColumn);

    const fullPluginUrl = `${pluginBase}?${pluginParams.toString()}`;

    // Wrap in CODAP launcher
    return `https://codap.concord.org/releases/latest/static/dg/en/cert/index.html?di=${encodeURIComponent(fullPluginUrl)}`;
}

// Open CODAP visualization in a new browser window/tab
function openCodapVisualization(index = currentModalDatasetIndex, xField = '', yField = '') {
    const dataset = (typeof index === 'number' && index >= 0) ? allDatasets[index] : (allDatasets[currentModalDatasetIndex] || allDatasets[0]);
    if (!dataset) return;

    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    if (!targetUrl || targetUrl === '#') {
        alert('No valid CSV URL available for CODAP visualization.');
        return;
    }

    const codapUrl = generateCodapUrl({
        csvUrl: targetUrl,
        xColumn: xField,
        yColumn: yField,
        title: dataset.Name || "Dataset"
    });

    window.open(codapUrl, '_blank');
}

// Prepare model table data (2 columns: X, Y), copy to clipboard, and open Desmos Calculator
function openDesmosModelVisualization(index = currentModalDatasetIndex, xField = '', yField = '', btnEl = null) {
    const dataset = allDatasets[index] || (allDatasets.length > 0 ? allDatasets[0] : null);
    if (!dataset) return;

    if (!btnEl) btnEl = document.getElementById('modal-visualize-btn');
    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    const filterRules = dataset.FilterFields || [];

    const processRowsAndCopy = (rawRows) => {
        const rows = applyFiltersMain(rawRows, filterRules);
        if (!rows || rows.length === 0) {
            flashButtonFeedback(btnEl, 'No data matching filter', true);
            return;
        }

        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);
        let matchedX = null;
        let matchedY = null;

        if (xField && xField.trim() !== '') {
            const normX = xField.trim().toLowerCase();
            matchedX = keys.find(k => k.trim().toLowerCase() === normX) ||
                       keys.find(k => k.trim().toLowerCase().includes(normX));
        }
        if (yField && yField.trim() !== '') {
            const normY = yField.trim().toLowerCase();
            matchedY = keys.find(k => k.trim().toLowerCase() === normY) ||
                       keys.find(k => k.trim().toLowerCase().includes(normY));
        }

        const numericCols = keys.filter(k => {
            const val = parseFloat(sampleRow[k]);
            return !isNaN(val);
        });

        if (!matchedX) matchedX = numericCols[0] || keys[0];
        if (!matchedY) matchedY = numericCols[1] || numericCols[0] || keys[1] || keys[0];

        const tsvLines = [];
        for (let i = 0; i < rows.length; i++) {
            const rawX = rows[i][matchedX];
            const rawY = rows[i][matchedY];
            if (rawX !== undefined && rawY !== undefined && rawX !== null && rawY !== null) {
                const nx = parseFloat(String(rawX).trim());
                const ny = parseFloat(String(rawY).trim());
                if (!isNaN(nx) && !isNaN(ny)) {
                    tsvLines.push(nx + '\t' + ny);
                }
            }
        }

        if (tsvLines.length === 0) {
            flashButtonFeedback(btnEl, 'No numbers found in columns', true);
            return;
        }

        const tsvString = tsvLines.join('\n');

        // 1. Copy table string to clipboard
        copyStringToClipboard(tsvString);

        // 2. Open Desmos Graphing Calculator in a new tab
        window.open('https://www.desmos.com/calculator', '_blank');

        // 3. Provide feedback on the button
        flashButtonFeedback(btnEl, `Copied Table (${tsvLines.length} rows)! Paste in Desmos`);
    };

    if (csvCache.has(targetUrl)) {
        processRowsAndCopy(csvCache.get(targetUrl));
        return;
    }

    if (btnEl) {
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Preparing Table...</span>';
        btnEl.disabled = true;
    }

    Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results && results.data && results.data.length > 0) {
                csvCache.set(targetUrl, results.data);
                processRowsAndCopy(results.data);
            } else {
                flashButtonFeedback(btnEl, 'Error: Empty CSV', true);
            }
        },
        error: function(err) {
            console.error('Error fetching CSV for Desmos copy:', err);
            flashButtonFeedback(btnEl, 'Error fetching CSV', true);
        }
    });
}

// Prepare distribution data (single column), copy to clipboard, and open Desmos Calculator
function openDesmosVisualization(index = currentModalDatasetIndex, targetField = '', btnEl = null) {
    const dataset = allDatasets[index] || (allDatasets.length > 0 ? allDatasets[0] : null);
    if (!dataset) return;

    if (!btnEl) btnEl = document.getElementById('modal-visualize-btn');

    if (!targetField) {
        const selectEl = document.getElementById('modal-queryable-field-select');
        if (selectEl && selectEl.value) {
            targetField = selectEl.value;
        }
    }

    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    const filterRules = dataset.FilterFields || [];

    const processRowsAndCopy = (rawRows) => {
        const rows = applyFiltersMain(rawRows, filterRules);
        if (!rows || rows.length === 0) {
            flashButtonFeedback(btnEl, 'No data matching filter', true);
            return;
        }

        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);
        let matchedCol = null;

        if (targetField && targetField.trim() !== '') {
            const normTarget = targetField.trim().toLowerCase();
            matchedCol = keys.find(k => k.trim().toLowerCase() === normTarget) ||
                         keys.find(k => k.trim().toLowerCase().includes(normTarget));
        }
        if (!matchedCol) {
            matchedCol = keys.find(k => {
                const val = parseFloat(sampleRow[k]);
                return !isNaN(val) && val > 0;
            }) || keys[0];
        }

        const values = [];
        for (let i = 0; i < rows.length; i++) {
            const rawVal = rows[i][matchedCol];
            if (rawVal !== undefined && rawVal !== null) {
                const num = parseFloat(String(rawVal).trim());
                if (!isNaN(num)) values.push(num);
            }
        }

        if (values.length === 0) {
            flashButtonFeedback(btnEl, 'No numbers found', true);
            return;
        }

        const tsvString = values.join('\n');

        // 1. Copy data to clipboard
        copyStringToClipboard(tsvString);

        // 2. Open Desmos Graphing Calculator in a new tab
        window.open('https://www.desmos.com/calculator', '_blank');

        // 3. Provide feedback on the button
        flashButtonFeedback(btnEl, `Copied Data (${values.length} rows)! Paste in Desmos`);
    };

    if (csvCache.has(targetUrl)) {
        processRowsAndCopy(csvCache.get(targetUrl));
        return;
    }

    if (btnEl) {
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Preparing Data...</span>';
        btnEl.disabled = true;
    }

    Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results && results.data && results.data.length > 0) {
                csvCache.set(targetUrl, results.data);
                processRowsAndCopy(results.data);
            } else {
                flashButtonFeedback(btnEl, 'Error: Empty CSV', true);
            }
        },
        error: function(err) {
            console.error('Error fetching CSV for Desmos copy:', err);
            flashButtonFeedback(btnEl, 'Error fetching CSV', true);
        }
    });
}

// Launch the standalone Slow Reveal Graph window using values from the modal inputs
function launchSlowRevealGraph() {
    const dataset = allDatasets[currentModalDatasetIndex];
    if (!dataset) return;

    const btnEl = document.getElementById('sr-launch-btn');
    const originalHTML = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> <span>Preparing...</span>';
        btnEl.disabled = true;
    }

    const titleInput = document.getElementById('sr-title-input');
    const xLabelInput = document.getElementById('sr-xlabel-input');
    const yLabelInput = document.getElementById('sr-ylabel-input');
    const xMinInput = document.getElementById('sr-xmin-input');
    const xMaxInput = document.getElementById('sr-xmax-input');
    const yMinInput = document.getElementById('sr-ymin-input');
    const yMaxInput = document.getElementById('sr-ymax-input');

    const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : (dataset.Name || 'Dataset Graph');
    const xLabel = (xLabelInput && xLabelInput.value.trim()) ? xLabelInput.value.trim() : 'X-Axis';
    const yLabel = (yLabelInput && yLabelInput.value.trim()) ? yLabelInput.value.trim() : 'Y-Axis';

    const rawXMin = xMinInput && xMinInput.value !== '' ? parseFloat(xMinInput.value) : NaN;
    const rawXMax = xMaxInput && xMaxInput.value !== '' ? parseFloat(xMaxInput.value) : NaN;
    const rawYMin = yMinInput && yMinInput.value !== '' ? parseFloat(yMinInput.value) : NaN;
    const rawYMax = yMaxInput && yMaxInput.value !== '' ? parseFloat(yMaxInput.value) : NaN;

    const dsType = (dataset.Type || '').trim().toLowerCase();
    const modelXSelect = document.getElementById('modal-model-x-select');
    const modelYSelect = document.getElementById('modal-model-y-select');
    const distSelect = document.getElementById('modal-queryable-field-select');

    let xField = '';
    let yField = '';
    if (dsType === 'model') {
        xField = modelXSelect ? modelXSelect.value : '';
        yField = modelYSelect ? modelYSelect.value : '';
    } else {
        yField = distSelect ? distSelect.value : '';
    }

    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    const filterRules = dataset.FilterFields || [];

    const buildAndOpen = (rawRows) => {
        const rows = applyFiltersMain(rawRows, filterRules);
        if (!rows || rows.length === 0) {
            alert('No data rows found matching filter conditions.');
            if (btnEl) {
                btnEl.innerHTML = originalHTML;
                btnEl.disabled = false;
            }
            return;
        }

        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);

        let matchedX = null;
        let matchedY = null;

        if (xField && xField.trim() !== '') {
            const normX = xField.trim().toLowerCase();
            matchedX = keys.find(k => k.trim().toLowerCase() === normX) ||
                       keys.find(k => k.trim().toLowerCase().includes(normX));
        }
        if (yField && yField.trim() !== '') {
            const normY = yField.trim().toLowerCase();
            matchedY = keys.find(k => k.trim().toLowerCase() === normY) ||
                       keys.find(k => k.trim().toLowerCase().includes(normY));
        }

        if (!matchedX && dsType === 'model') {
            const numericCols = keys.filter(k => !isNaN(parseFloat(sampleRow[k])));
            matchedX = numericCols[0] || keys[0];
        }
        if (!matchedY) {
            const numericCols = keys.filter(k => !isNaN(parseFloat(sampleRow[k])));
            matchedY = numericCols[1] || numericCols[0] || keys[1] || keys[0];
        }

        const points = [];
        for (let i = 0; i < rows.length; i++) {
            let px = null;
            let py = null;

            if (matchedX) {
                const rx = parseFloat(String(rows[i][matchedX]).trim());
                if (!isNaN(rx)) px = rx;
            } else {
                px = i + 1; // Sequential index for single distribution
            }

            if (matchedY) {
                const ry = parseFloat(String(rows[i][matchedY]).trim());
                if (!isNaN(ry)) py = ry;
            }

            if (px !== null && py !== null) {
                points.push([px, py]);
            }
        }

        if (points.length === 0) {
            alert('Could not find numeric values for the selected fields.');
            if (btnEl) {
                btnEl.innerHTML = originalHTML;
                btnEl.disabled = false;
            }
            return;
        }

        const xVals = points.map(p => p[0]);
        const yVals = points.map(p => p[1]);

        const finalXMin = !isNaN(rawXMin) ? rawXMin : Math.min(...xVals);
        const finalXMax = !isNaN(rawXMax) ? rawXMax : Math.max(...xVals);
        const finalYMin = !isNaN(rawYMin) ? rawYMin : Math.min(...yVals);
        const finalYMax = !isNaN(rawYMax) ? rawYMax : Math.max(...yVals);

        const config = {
            title: title,
            xLabel: xLabel,
            yLabel: yLabel,
            xMin: finalXMin,
            xMax: finalXMax,
            yMin: finalYMin,
            yMax: finalYMax,
            points: points
        };

        window.slowRevealConfig = config;
        try {
            localStorage.setItem('desmos_slow_reveal_config', JSON.stringify(config));
        } catch (e) {
            console.warn('localStorage write error:', e);
        }

        const w = 1200;
        const h = 800;
        const left = Math.max(0, Math.round((window.screen.width - w) / 2));
        const top = Math.max(0, Math.round((window.screen.height - h) / 2));

        const win = window.open('slow_reveal.html', 'DesmosSlowReveal', `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`);
        if (win) {
            win.focus();
        }

        if (btnEl) {
            btnEl.innerHTML = originalHTML;
            btnEl.disabled = false;
        }
    };

    if (csvCache.has(targetUrl)) {
        buildAndOpen(csvCache.get(targetUrl));
        return;
    }

    Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results && results.data && results.data.length > 0) {
                csvCache.set(targetUrl, results.data);
                buildAndOpen(results.data);
            } else {
                alert('Failed to load dataset CSV.');
                if (btnEl) {
                    btnEl.innerHTML = originalHTML;
                    btnEl.disabled = false;
                }
            }
        },
        error: function(err) {
            console.error('Error fetching CSV for slow reveal:', err);
            alert('Error fetching dataset CSV.');
            if (btnEl) {
                btnEl.innerHTML = originalHTML;
                btnEl.disabled = false;
            }
        }
    });
}
