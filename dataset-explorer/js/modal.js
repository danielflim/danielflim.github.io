/**
 * modal.js - Detailed dataset modal display, population and dismissal
 */

// Open detailed information card modal for dataset at given index
function openModal(index) {
    currentModalDatasetIndex = index;
    const dataset = allDatasets[index];
    if (!dataset) return;

    preloadDatasetCsv(dataset.URL, dataset.Name);

    // Title
    const titleEl = document.getElementById('modal-title');
    if (titleEl) titleEl.innerHTML = formatHtmlContent(dataset.Name || 'Untitled Dataset');

    // Badges in Header
    const badgesEl = document.getElementById('modal-badges');
    if (badgesEl) {
        badgesEl.innerHTML = `
            ${getRowCountBadgeHTML(dataset.RowCount)}
            ${getTypeBadgeHTML(dataset.Type)}
        `;
    }

    // Description
    const descEl = document.getElementById('modal-description');
    if (descEl) {
        descEl.innerHTML = formatHtmlContent(dataset.Description) || '<span class="text-slate-400 italic">No description provided for this dataset.</span>';
    }

    // Source Link in Description Box
    const sourceContainer = document.getElementById('modal-source-container');
    const sourceLink = document.getElementById('modal-source-link');
    const sourceText = document.getElementById('modal-source-text');
    const rawSource = (dataset.Source || '').trim();

    if (sourceContainer && sourceLink && sourceText) {
        if (rawSource && rawSource !== '' && rawSource !== '#') {
            let sourceUrl = rawSource;
            let displayLabel = rawSource;

            if (rawSource.includes('<a') && rawSource.includes('</a>')) {
                const hrefMatch = rawSource.match(/href=['"]([^'"]+)['"]/i);
                const textMatch = rawSource.match(/>([^<]+)</);
                if (hrefMatch && hrefMatch[1]) {
                    sourceUrl = hrefMatch[1];
                    displayLabel = textMatch ? textMatch[1] : hrefMatch[1];
                }
            } else if (rawSource.startsWith('http://') || rawSource.startsWith('https://') || rawSource.startsWith('ftp://') || rawSource.includes('www.') || rawSource.includes('.com') || rawSource.includes('.org') || rawSource.includes('.gov') || rawSource.includes('.edu')) {
                if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://') && !sourceUrl.startsWith('ftp://')) {
                    sourceUrl = 'https://' + sourceUrl;
                }
                try {
                    const parsedUrl = new URL(sourceUrl);
                    displayLabel = parsedUrl.hostname.replace(/^www\./, '') + (parsedUrl.pathname !== '/' && parsedUrl.pathname.length > 1 ? parsedUrl.pathname.slice(0, 25) + '...' : '');
                } catch (e) {
                    displayLabel = rawSource;
                }
            } else {
                if (dataset.URL && dataset.URL !== '#') {
                    sourceUrl = dataset.URL;
                }
            }

            sourceLink.href = sourceUrl;
            sourceText.innerHTML = formatHtmlContent(displayLabel);
            sourceContainer.classList.remove('hidden');
            sourceContainer.classList.add('flex');
        } else {
            sourceContainer.classList.add('hidden');
            sourceContainer.classList.remove('flex');
        }
    }

    // Grade (Badges matching search cards)
    const gradeContainer = document.getElementById('modal-grade-container');
    if (gradeContainer) {
        gradeContainer.innerHTML = `<div class="flex flex-wrap gap-1.5">${createCommaBadges(dataset.Grade, 'bg-indigo-50 text-indigo-700')}</div>`;
    }

    // Subject (Badges matching search cards)
    const subjectContainer = document.getElementById('modal-subject-container');
    if (subjectContainer) {
        subjectContainer.innerHTML = `<div class="flex flex-wrap gap-1.5">${createCommaBadges(dataset.Subject, 'bg-emerald-50 text-emerald-700')}</div>`;
    }

    // Dataset Type (Meta Grid Card)
    const typeContainer = document.getElementById('modal-type-container');
    if (typeContainer) {
        typeContainer.innerHTML = getTypeBadgeHTML(dataset.Type) || '<span class="text-slate-400 italic">Unspecified</span>';
    }

    // Standard (Badges matching search cards)
    const standardContainer = document.getElementById('modal-standard-container');
    if (standardContainer) {
        standardContainer.innerHTML = `<div class="flex flex-wrap gap-1.5">${createCommaBadges(dataset.Standard, 'bg-amber-50 text-amber-700')}</div>`;
    }

    // Questions (' | ' delimited -> Unordered List)
    const questionsContainer = document.getElementById('modal-questions-container');
    if (questionsContainer) {
        questionsContainer.innerHTML = formatPipeUnorderedList(dataset.Questions, false);
    }

    // Dictionary (' | ' delimited -> Data Table)
    const dictionaryContainer = document.getElementById('modal-dictionary-container');
    if (dictionaryContainer) {
        dictionaryContainer.innerHTML = formatDictionaryTable(dataset.Dictionary, index);
    }

    // Queryable Fields Dropdowns for Distribution and Model dataset types
    const distContainer = document.getElementById('modal-dist-select-container');
    const modelContainer = document.getElementById('modal-model-select-container');
    
    const distSelect = document.getElementById('modal-queryable-field-select');
    const modelXSelect = document.getElementById('modal-model-x-select');
    const modelYSelect = document.getElementById('modal-model-y-select');

    const datasetType = (dataset.Type || '').trim().toLowerCase();
    const queryableFields = dataset.QueryableFields || [];

    // Get available options list (queryable fields or dictionary terms)
    let fieldOptions = queryableFields;
    if (fieldOptions.length === 0 && dataset.Dictionary) {
        fieldOptions = dataset.Dictionary.split('|').map(s => s.split(':')[0].trim().replace(/\*$/, '')).filter(Boolean);
    }

    if (datasetType === 'model') {
        if (distContainer) {
            distContainer.classList.add('hidden');
            distContainer.classList.remove('flex');
        }

        if (fieldOptions.length > 0 && modelXSelect && modelYSelect && modelContainer) {
            modelXSelect.innerHTML = fieldOptions.map(f => `<option value="${f}">${f}</option>`).join('');
            modelYSelect.innerHTML = fieldOptions.map(f => `<option value="${f}">${f}</option>`).join('');
            
            // Default Y to 2nd item if available, otherwise 1st
            if (fieldOptions.length > 1) {
                modelYSelect.selectedIndex = 1;
            }

            modelContainer.classList.remove('hidden');
            modelContainer.classList.add('flex');
        } else if (modelContainer) {
            modelContainer.classList.add('hidden');
            modelContainer.classList.remove('flex');
        }
    } else {
        // Default / Distribution type
        if (modelContainer) {
            modelContainer.classList.add('hidden');
            modelContainer.classList.remove('flex');
        }

        if (fieldOptions.length > 0 && distSelect && distContainer) {
            distSelect.innerHTML = fieldOptions.map(f => `<option value="${f}">${f}</option>`).join('');
            distContainer.classList.remove('hidden');
            distContainer.classList.add('flex');
        } else if (distContainer) {
            distContainer.classList.add('hidden');
            distContainer.classList.remove('flex');
        }
    }

    // Desmos Button Click Event
    const vizBtn = document.getElementById('modal-visualize-btn');
    if (vizBtn) {
        vizBtn.onclick = function() {
            const dsType = (dataset.Type || '').trim().toLowerCase();
            if (dsType === 'model') {
                const xVal = modelXSelect ? modelXSelect.value : '';
                const yVal = modelYSelect ? modelYSelect.value : '';
                openDesmosModelVisualization(index, xVal, yVal, vizBtn);
            } else {
                const selectedField = distSelect ? distSelect.value : '';
                openDesmosVisualization(index, selectedField, vizBtn);
            }
        };
    }

    // CODAP Button Click Event
    const codapBtn = document.getElementById('modal-codap-btn');
    if (codapBtn) {
        codapBtn.onclick = function() {
            const dsType = (dataset.Type || '').trim().toLowerCase();
            if (dsType === 'model') {
                const xVal = modelXSelect ? modelXSelect.value : '';
                const yVal = modelYSelect ? modelYSelect.value : '';
                openCodapVisualization(index, xVal, yVal);
            } else {
                const selectedField = distSelect ? distSelect.value : '';
                openCodapVisualization(index, selectedField, '');
            }
        };
    }

    // Filter Fields Constraint Text above X and Y Dropdowns
    const constraintBox = document.getElementById('modal-filter-constraint-box');
    const constraintVal = document.getElementById('modal-filter-constraint-val');
    const filterFields = dataset.FilterFields || [];

    if (constraintBox && constraintVal) {
        if (filterFields.length > 0) {
            const filterSummary = filterFields.map(f => {
                return f.defaultValue ? `'${f.field}' = '${f.defaultValue}'` : `'${f.field}'`;
            }).join(' and ');
            constraintVal.textContent = filterSummary;
            constraintBox.classList.remove('hidden');
            constraintBox.classList.add('flex');
        } else {
            constraintBox.classList.add('hidden');
            constraintBox.classList.remove('flex');
        }
    }

    // Action URL
    const urlBtn = document.getElementById('modal-action-url');
    if (urlBtn) {
        if (dataset.URL && dataset.URL !== '#') {
            urlBtn.href = dataset.URL;
            urlBtn.classList.remove('pointer-events-none', 'opacity-50');
        } else {
            urlBtn.href = '#';
            urlBtn.classList.add('pointer-events-none', 'opacity-50');
        }
    }

    // Initialize Slow Reveal Section Defaults and Listeners
    updateSlowRevealDefaults(dataset);
    if (modelXSelect) modelXSelect.onchange = () => updateSlowRevealDefaults(dataset);
    if (modelYSelect) modelYSelect.onchange = () => updateSlowRevealDefaults(dataset);
    if (distSelect) distSelect.onchange = () => updateSlowRevealDefaults(dataset);

    // Display modal
    const modal = document.getElementById('dataset-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    }
}

// Helper: Populate Slow Reveal inputs with sensible defaults from selected dataset and fields
function updateSlowRevealDefaults(dataset) {
    if (!dataset) return;
    const titleInput = document.getElementById('sr-title-input');
    const xLabelInput = document.getElementById('sr-xlabel-input');
    const yLabelInput = document.getElementById('sr-ylabel-input');
    const xMinInput = document.getElementById('sr-xmin-input');
    const xMaxInput = document.getElementById('sr-xmax-input');
    const yMinInput = document.getElementById('sr-ymin-input');
    const yMaxInput = document.getElementById('sr-ymax-input');

    if (titleInput) {
        titleInput.value = dataset.Name || 'Untitled Dataset';
    }

    const dsType = (dataset.Type || '').trim().toLowerCase();
    const modelXSelect = document.getElementById('modal-model-x-select');
    const modelYSelect = document.getElementById('modal-model-y-select');
    const distSelect = document.getElementById('modal-queryable-field-select');

    let xCol = '';
    let yCol = '';

    if (dsType === 'model') {
        xCol = modelXSelect ? modelXSelect.value : '';
        yCol = modelYSelect ? modelYSelect.value : '';
    } else {
        xCol = 'Index';
        yCol = distSelect ? distSelect.value : '';
    }

    if (xLabelInput) xLabelInput.value = xCol;
    if (yLabelInput) yLabelInput.value = yCol;

    // Try to auto-populate min and max if CSV is already in cache
    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    const filterRules = dataset.FilterFields || [];

    const computeAndSetRanges = (rawRows) => {
        if (!rawRows || rawRows.length === 0) return;
        const rows = applyFiltersMain(rawRows, filterRules);
        if (!rows || rows.length === 0) return;

        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);

        let matchedX = null;
        let matchedY = null;

        if (xCol && xCol !== 'Index') {
            const normX = xCol.trim().toLowerCase();
            matchedX = keys.find(k => k.trim().toLowerCase() === normX) ||
                       keys.find(k => k.trim().toLowerCase().includes(normX));
        }
        if (yCol) {
            const normY = yCol.trim().toLowerCase();
            matchedY = keys.find(k => k.trim().toLowerCase() === normY) ||
                       keys.find(k => k.trim().toLowerCase().includes(normY));
        }

        const xNums = [];
        const yNums = [];

        for (let i = 0; i < rows.length; i++) {
            if (matchedX) {
                const nx = parseFloat(rows[i][matchedX]);
                if (!isNaN(nx)) xNums.push(nx);
            } else {
                xNums.push(i + 1);
            }
            if (matchedY) {
                const ny = parseFloat(rows[i][matchedY]);
                if (!isNaN(ny)) yNums.push(ny);
            }
        }

        if (xNums.length > 0) {
            const xMin = Math.min(...xNums);
            const xMax = Math.max(...xNums);
            if (xMinInput) xMinInput.value = xMin;
            if (xMaxInput) xMaxInput.value = xMax;
        }
        if (yNums.length > 0) {
            const yMin = Math.min(...yNums);
            const yMax = Math.max(...yNums);
            if (yMinInput) yMinInput.value = yMin;
            if (yMaxInput) yMaxInput.value = yMax;
        }
    };

    if (csvCache.has(targetUrl)) {
        computeAndSetRanges(csvCache.get(targetUrl));
    }
}

// Close detailed information card modal
function closeModal() {
    const modal = document.getElementById('dataset-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.body.style.overflow = ''; // Restore background scrolling
}
