/**
 * data.js - Data ingestion, sanitization, metadata extraction, CSV caching and filtering
 */

// Extract queryable and filter fields from dictionary string
function extractDictionaryMeta(dictStr) {
    const queryableFields = [];
    const filterFields = []; // Array of { field, defaultValue }

    if (dictStr) {
        dictStr.split('|').forEach(item => {
            const parts = item.split(':');
            const rawKey = parts[0] ? parts[0].trim() : '';

            if (rawKey.includes('**')) {
                // Filter Field: e.g. entity**{United States}
                const match = rawKey.match(/^([^*]+)\*\*\{([^}]+)\}/);
                if (match) {
                    const field = match[1].trim();
                    const defaultValue = match[2].trim();
                    if (field && defaultValue) {
                        filterFields.push({ field, defaultValue });
                    }
                } else {
                    const field = rawKey.replace(/\*\*/g, '').replace(/\{[^}]*\}/g, '').trim();
                    if (field) {
                        filterFields.push({ field, defaultValue: '' });
                    }
                }
            } else if (rawKey.endsWith('*')) {
                // Queryable Field: e.g. math_score*
                const cleanTerm = rawKey.slice(0, -1).trim();
                if (cleanTerm) {
                    queryableFields.push(cleanTerm);
                }
            }
        });
    }

    return { queryableFields, filterFields };
}

// Fallback data loader when Google Sheets endpoint is unavailable
function useFallbackData(reason) {
    allDatasets = SAMPLE_FALLBACK_DATA.map(d => {
        const meta = extractDictionaryMeta(d.Dictionary);
        return {
            ...d,
            QueryableFields: meta.queryableFields,
            FilterFields: meta.filterFields
        };
    }).sort((a, b) => (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' }));

    const syncDot = document.getElementById('sync-dot');
    const syncText = document.getElementById('sync-text');
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-blue-500';
    if (syncText) syncText.textContent = `Demo Mode (${allDatasets.length} datasets)`;
}

// Standardize properties to ensure exact property names
function sanitizeData(rawRows) {
    const datasets = rawRows.map(row => {
        const keys = Object.keys(row);
        
        // Flexible getter matching exact or substring key names
        const getValue = (...candidates) => {
            for (const candidate of candidates) {
                const normCandidate = candidate.toLowerCase().trim();
                // 1. Exact case-insensitive match
                let matchedKey = keys.find(k => k.trim().toLowerCase() === normCandidate);
                // 2. Partial substring match (e.g. "Lesson URL", "Lesson Plan", "Visualization")
                if (!matchedKey) {
                    matchedKey = keys.find(k => k.trim().toLowerCase().includes(normCandidate));
                }
                if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                    const val = String(row[matchedKey]).trim();
                    if (val !== '') return val;
                }
            }
            return '';
        };

        const dictStr = getValue('Dictionary');
        const meta = extractDictionaryMeta(dictStr);

        const rawRowVal = getValue('Rows', 'Row Count', 'RowCount', 'Size', 'Count');
        let rowCount = null;
        const parsedNum = parseInt(String(rawRowVal).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedNum) && parsedNum > 0) {
            rowCount = parsedNum;
        } else {
            const normName = (getValue('Name') || '').toLowerCase().trim();
            if (KNOWN_DATASET_ROW_COUNTS[normName] !== undefined) {
                rowCount = KNOWN_DATASET_ROW_COUNTS[normName];
            }
        }

        return {
            Name: getValue('Name') || 'Untitled Dataset',
            Grade: getValue('Grade') || 'Unspecified',
            Subject: getValue('Subject') || 'General',
            Standard: getValue('Standard') || 'None Specified',
            RowCount: rowCount,
            Type: getValue('Type'),
            Description: getValue('Description') || 'No description provided.',
            Questions: getValue('Questions'),
            Dictionary: dictStr,
            QueryableFields: meta.queryableFields,
            FilterFields: meta.filterFields,
            URL: getValue('URL') || '#',
            Source: getValue('Source', 'Source URL', 'Data Source', 'Dataset Source', 'Citation')
        };
    }).filter(d => d.Name && d.Name.trim() !== '');

    return datasets.sort((a, b) => (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' }));
}

// Fetch Google Sheet data using PapaParse
function fetchSpreadsheetData() {
    const syncDot = document.getElementById('sync-dot');
    const syncText = document.getElementById('sync-text');
    const refreshIcon = document.getElementById('refresh-icon');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    if (syncText) syncText.textContent = 'Fetching sheet...';
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');

    Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (refreshIcon) refreshIcon.classList.remove('fa-spin');
            if (results.data && results.data.length > 0 && results.data[0].Name) {
                allDatasets = sanitizeData(results.data);
                if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
                if (syncText) syncText.textContent = `Live Google Sheet (${allDatasets.length} entries)`;
            } else {
                console.warn('Google Sheet empty or inaccessible. Using fallback dataset.');
                useFallbackData('Spreadsheet formatted or empty');
            }
            processDataAndRender();
        },
        error: function(err) {
            console.error('Error fetching Google Sheet:', err);
            if (refreshIcon) refreshIcon.classList.remove('fa-spin');
            useFallbackData('Sheet load blocked / CORS');
            processDataAndRender();
        }
    });
}

// Convert GitHub web URLs to raw URLs or use standard fallback
function getRawCsvUrl(urlStr, datasetName = '') {
    let targetUrl = (urlStr || '').trim();

    // 1. Convert GitHub web URLs (e.g. github.com/owner/repo/blob/main/file.csv) to raw format
    if (targetUrl.includes('github.com')) {
        targetUrl = targetUrl
            .replace('github.com/', 'raw.githubusercontent.com/')
            .replace('/blob/', '/')
            .replace('/raw/', '/');
    }

    // 2. If it is a valid direct CSV endpoint, return it immediately
    const isValidCsv = targetUrl.startsWith('http') && !targetUrl.includes('spreadsheets/d/') && targetUrl !== '#';
    if (isValidCsv) {
        return targetUrl;
    }

    // 3. Fallback CSV endpoints if URL is missing or points to Google Sheet
    const normName = (datasetName || '').toLowerCase();
    if (normName.includes('nba') || normName.includes('basketball')) {
        return 'https://raw.githubusercontent.com/daniel-lim-ocid/datasets/main/nba_players.csv';
    }
    return 'https://raw.githubusercontent.com/daniel-lim-ocid/datasets/main/galton_parent_child_heights.csv';
}

// Preload and cache CSV data, backfilling RowCount if needed
function preloadDatasetCsv(url, datasetName) {
    const targetUrl = getRawCsvUrl(url, datasetName);
    if (!targetUrl) return;

    const updateRowCountIfMissing = (count) => {
        const normName = (datasetName || '').toLowerCase().trim();
        const matchedDs = allDatasets.find(d => (d.Name || '').toLowerCase().trim() === normName);
        if (matchedDs) {
            if (!matchedDs.RowCount || matchedDs.RowCount === 0) {
                matchedDs.RowCount = count;
                const badgesEl = document.getElementById('modal-badges');
                if (badgesEl && currentModalDatasetIndex !== null && allDatasets[currentModalDatasetIndex] === matchedDs) {
                    badgesEl.innerHTML = `
                        ${getRowCountBadgeHTML(matchedDs.RowCount)}
                        ${getTypeBadgeHTML(matchedDs.Type)}
                    `;
                }
            }
            if (typeof updateSlowRevealDefaults === 'function' && currentModalDatasetIndex !== null && allDatasets[currentModalDatasetIndex] === matchedDs) {
                updateSlowRevealDefaults(matchedDs);
            }
        }
    };

    if (csvCache.has(targetUrl)) {
        const data = csvCache.get(targetUrl);
        if (data && data.length > 0) {
            updateRowCountIfMissing(data.length);
        }
        return;
    }

    Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results && results.data && results.data.length > 0) {
                csvCache.set(targetUrl, results.data);
                updateRowCountIfMissing(results.data.length);
            }
        }
    });
}

// Apply multi-field filtering logic on rows
function applyFiltersMain(rows, filters) {
    if (!filters || filters.length === 0 || !rows || rows.length === 0) return rows;
    const keys = Object.keys(rows[0]);
    return rows.filter(row => {
        return filters.every(rule => {
            if (!rule.field || !rule.defaultValue) return true;
            const normField = rule.field.trim().toLowerCase();
            const matchedCol = keys.find(k => k.trim().toLowerCase() === normField) ||
                               keys.find(k => k.trim().toLowerCase().includes(normField));
            if (!matchedCol) return true;
            const targetVal = rule.defaultValue.trim().toLowerCase();
            const rowVal = String(row[matchedCol] || '').trim().toLowerCase();
            return rowVal === targetVal;
        });
    });
}
