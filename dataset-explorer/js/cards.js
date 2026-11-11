/**
 * cards.js - Card layout generation, grid/list items, and data dictionary table
 */

// Render datasets into container based on view mode (grid or list)
function renderDatasets() {
    const container = document.getElementById('dataset-container');
    const emptyState = document.getElementById('empty-state');
    if (!container || !emptyState) return;

    container.innerHTML = '';

    if (filteredDatasets.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    if (viewMode === 'grid') {
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';
    } else {
        container.className = 'flex flex-col space-y-3';
    }

    filteredDatasets.forEach((dataset, index) => {
        let originalIndex = allDatasets.indexOf(dataset);
        if (originalIndex === -1) {
            originalIndex = allDatasets.findIndex(d => d.Name === dataset.Name);
        }
        if (originalIndex === -1) {
            originalIndex = index;
        }

        if (viewMode === 'grid') {
            container.appendChild(createGridCard(dataset, originalIndex));
        } else {
            container.appendChild(createListItem(dataset, originalIndex));
        }
    });
}

// Create a single Grid card
function createGridCard(dataset, index) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-blue-400 cursor-pointer';
    card.onclick = (e) => {
        if (e.target.closest('a')) return;
        openModal(index);
    };
    
    card.innerHTML = `
        <div>
            <!-- Solid Lighter Gray Background Header for Dataset Title -->
            <div class="bg-slate-100/90 text-slate-900 p-4 sm:p-5 rounded-t-2xl space-y-2 border-b border-slate-200/80">
                <div class="flex items-start justify-between gap-2">
                    <h3 class="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition line-clamp-2">
                        ${formatHtmlContent(dataset.Name)}
                    </h3>
                    ${dataset.URL && dataset.URL !== '#' ? `
                        <a href="${dataset.URL}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-slate-400 hover:text-slate-700 text-xs p-1 shrink-0 transition" title="Open Resource Link">
                            <i class="fa-solid fa-up-right-from-square"></i>
                        </a>
                    ` : ''}
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                    ${getRowCountBadgeHTML(dataset.RowCount)}
                    ${getTypeBadgeHTML(dataset.Type)}
                </div>
            </div>

            <!-- Card Body -->
            <div class="p-4 sm:p-5 space-y-4">
                <div class="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    ${formatHtmlContent(dataset.Description) || 'No description available.'}
                </div>

                <div class="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Grades</span>
                        <div class="flex flex-wrap gap-1">
                            ${createCommaBadges(dataset.Grade, 'bg-indigo-50 text-indigo-700')}
                        </div>
                    </div>

                    <div>
                        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Subjects</span>
                        <div class="flex flex-wrap gap-1">
                            ${createCommaBadges(dataset.Subject, 'bg-emerald-50 text-emerald-700')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return card;
}

// Create a single List item
function createListItem(dataset, index) {
    const item = document.createElement('div');
    item.className = 'bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden group cursor-pointer hover:border-blue-400';
    item.onclick = (e) => {
        if (e.target.closest('a')) return;
        openModal(index);
    };

    item.innerHTML = `
        <!-- Light Gray Background Header for Title -->
        <div class="bg-slate-100/90 text-slate-900 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                    ${formatHtmlContent(dataset.Name)}
                </h3>
                ${getRowCountBadgeHTML(dataset.RowCount)}
                ${getTypeBadgeHTML(dataset.Type)}
            </div>
            ${dataset.URL && dataset.URL !== '#' ? `
                <a href="${dataset.URL}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-slate-400 hover:text-slate-700 text-xs p-1 shrink-0 transition" title="Open Resource Link">
                    <i class="fa-solid fa-up-right-from-square"></i>
                </a>
            ` : ''}
        </div>

        <!-- Content Body -->
        <div class="p-4 space-y-2">
            <div class="text-xs text-slate-600 leading-relaxed line-clamp-2">${formatHtmlContent(dataset.Description) || 'No description available.'}</div>
            <div class="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-100">
                <span class="text-slate-500"><strong>Grades:</strong> ${createCommaBadges(dataset.Grade, 'bg-slate-100 text-slate-700')}</span>
                <span class="text-slate-300">•</span>
                <span class="text-slate-500"><strong>Subject:</strong> ${createCommaBadges(dataset.Subject, 'bg-slate-100 text-slate-700')}</span>
            </div>
        </div>
    `;
    return item;
}

// Format the dictionary text into an HTML table with individual copy buttons
function formatDictionaryTable(str, datasetIndex = null) {
    if (!str) return '<p class="text-slate-400 italic">No data dictionary available</p>';
    const items = str.split('|').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return '<p class="text-slate-400 italic">No data dictionary available</p>';

    const rows = items.map(item => {
        const parts = item.split(':');
        let rawKey = parts[0] ? parts[0].trim() : '';
        const desc = parts.slice(1).join(':').trim();

        let displayTerm = rawKey;
        let termBadgeHTML = '';
        let desmosColHTML = '<span class="text-slate-300">-</span>';

        if (rawKey.includes('**')) {
            // Filter field e.g. entity**{United States}
            const match = rawKey.match(/^([^*]+)\*\*\{([^}]+)\}/);
            if (match) {
                displayTerm = match[1].trim();
            } else {
                displayTerm = rawKey.replace(/\*\*/g, '').replace(/\{[^}]*\}/g, '').trim();
            }
            termBadgeHTML = '';
        } else if (rawKey.endsWith('*')) {
            // Queryable field e.g. math_score*
            const cleanTerm = rawKey.slice(0, -1).trim();
            displayTerm = cleanTerm + '*'; // Simple '*' next to queryable field name
            
            const safeTerm = cleanTerm.replace(/'/g, "\\'");
            const safeIdx = (datasetIndex !== null && datasetIndex !== undefined) ? datasetIndex : 'currentModalDatasetIndex';
            
            desmosColHTML = `
                <button onclick="copyFieldDesmosList(${safeIdx}, '${safeTerm}', this)" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-sans font-semibold inline-flex items-center gap-1.5 transition shadow-2xs" title="Copy ALL field data formatted as Desmos list e.g. [1, 2, 3]">
                    <i class="fa-solid fa-copy text-[10px] text-amber-700"></i>
                    <span>Copy Desmos List</span>
                </button>
            `;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="py-2.5 px-3 text-slate-800 font-mono font-bold text-[11px] bg-slate-50/50 flex items-center justify-between gap-2">
                    <span>${formatHtmlContent(displayTerm)}</span>
                    ${termBadgeHTML}
                </td>
                <td class="py-2.5 px-3 text-slate-600 text-xs">${formatHtmlContent(desc) || '-'}</td>
                <td class="py-2.5 px-3 text-xs text-left">${desmosColHTML}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table class="w-full text-left border-collapse bg-white">
                <thead>
                    <tr class="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th class="py-2.5 px-3 w-1/4">Field / Term</th>
                        <th class="py-2.5 px-3 w-2/4">Description</th>
                        <th class="py-2.5 px-3 w-1/4">Desmos Data</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// Copy single column/field data formatted as a Desmos list [v1, v2, ...]
function copyFieldDesmosList(datasetIndex, fieldName, btnEl) {
    const dataset = (typeof datasetIndex === 'number' && datasetIndex >= 0) ? allDatasets[datasetIndex] : (allDatasets[currentModalDatasetIndex] || allDatasets[0]);
    if (!dataset) return;

    const originalHTML = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[9px]"></i> Fetching...';
        btnEl.disabled = true;
    }

    const targetUrl = getRawCsvUrl(dataset.URL, dataset.Name);
    const filterRules = dataset.FilterFields || [];

    Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            try {
                let rows = results.data || [];
                rows = applyFiltersMain(rows, filterRules);

                if (rows.length === 0) {
                    if (btnEl) {
                        btnEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-600 text-[9px]"></i> No Data';
                        setTimeout(() => { btnEl.innerHTML = originalHTML; btnEl.disabled = false; }, 2000);
                    }
                    return;
                }

                const sampleRow = rows[0];
                const keys = Object.keys(sampleRow);
                const normField = fieldName.trim().toLowerCase();
                const matchedCol = keys.find(k => k.trim().toLowerCase() === normField) ||
                                   keys.find(k => k.trim().toLowerCase().includes(normField)) ||
                                   keys[0];

                // Extract ALL numeric data rows (no 100 limit)
                const values = [];
                for (let i = 0; i < rows.length; i++) {
                    const rawVal = rows[i][matchedCol];
                    if (rawVal !== undefined && rawVal !== null) {
                        const num = parseFloat(String(rawVal).trim());
                        if (!isNaN(num)) {
                            values.push(num);
                        }
                    }
                }

                if (values.length === 0) {
                    if (btnEl) {
                        btnEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-600 text-[9px]"></i> No Numbers';
                        setTimeout(() => { btnEl.innerHTML = originalHTML; btnEl.disabled = false; }, 2000);
                    }
                    return;
                }

                const desmosListStr = '[' + values.join(', ') + ']';

                const showCopied = () => {
                    if (btnEl) {
                        btnEl.innerHTML = `<i class="fa-solid fa-check text-emerald-600 text-[9px]"></i> <span class="text-emerald-800">Copied (${values.length})!</span>`;
                        btnEl.classList.remove('bg-amber-50', 'hover:bg-amber-100', 'border-amber-300');
                        btnEl.classList.add('bg-emerald-100', 'border-emerald-300');
                        setTimeout(() => {
                            btnEl.innerHTML = originalHTML;
                            btnEl.classList.remove('bg-emerald-100', 'border-emerald-300');
                            btnEl.classList.add('bg-amber-50', 'hover:bg-amber-100', 'border-amber-300');
                            btnEl.disabled = false;
                        }, 2500);
                    }
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(desmosListStr).then(showCopied).catch(() => {
                        fallbackCopy(desmosListStr);
                        showCopied();
                    });
                } else {
                    fallbackCopy(desmosListStr);
                    showCopied();
                }
            } catch (e) {
                console.error('Error extracting copy list:', e);
                if (btnEl) {
                    btnEl.innerHTML = '<i class="fa-solid fa-xmark text-red-500 text-[9px]"></i> Error';
                    setTimeout(() => { btnEl.innerHTML = originalHTML; btnEl.disabled = false; }, 2000);
                }
            }
        },
        error: function(err) {
            console.error('Error fetching CSV for copy:', err);
            if (btnEl) {
                btnEl.innerHTML = '<i class="fa-solid fa-xmark text-red-500 text-[9px]"></i> Error';
                setTimeout(() => { btnEl.innerHTML = originalHTML; btnEl.disabled = false; }, 2000);
            }
        }
    });
}
