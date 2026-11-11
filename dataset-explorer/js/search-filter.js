/**
 * search-filter.js - Search input, category dropdown filters, and view mode toggling
 */

// Post-fetch handler to populate UI controls and trigger first render
function processDataAndRender() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.add('hidden');
    populateFilterDropdowns();
    handleSearchFilter();
}

// Populate Grade and Subject dropdowns dynamically based on dataset metadata
function populateFilterDropdowns() {
    const gradeSelect = document.getElementById('grade-filter');
    const subjectSelect = document.getElementById('subject-filter');
    if (!gradeSelect || !subjectSelect) return;

    // Preserve current selections if any
    const currentGrade = gradeSelect.value;
    const currentSubject = subjectSelect.value;

    // Extract unique Grades (comma split)
    const gradesSet = new Set();
    allDatasets.forEach(d => {
        if (d.Grade) {
            d.Grade.split(',').forEach(g => {
                const trimmed = g.trim();
                if (trimmed) gradesSet.add(trimmed);
            });
        }
    });

    // Extract unique Subjects (comma split)
    const subjectsSet = new Set();
    allDatasets.forEach(d => {
        if (d.Subject) {
            d.Subject.split(',').forEach(s => {
                const trimmed = s.trim();
                if (trimmed) subjectsSet.add(trimmed);
            });
        }
    });

    // Populate Grade Dropdown
    gradeSelect.innerHTML = '<option value="">All Grades</option>';
    Array.from(gradesSet).sort().forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        gradeSelect.appendChild(opt);
    });

    // Populate Subject Dropdown
    subjectSelect.innerHTML = '<option value="">All Subjects</option>';
    Array.from(subjectsSet).sort().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        subjectSelect.appendChild(opt);
    });

    gradeSelect.value = currentGrade;
    subjectSelect.value = currentSubject;
}

// Main search and filter handler
function handleSearchFilter() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const gradeFilter = document.getElementById('grade-filter') ? document.getElementById('grade-filter').value : '';
    const subjectFilter = document.getElementById('subject-filter') ? document.getElementById('subject-filter').value : '';
    const rowsFilterEl = document.getElementById('rows-filter') || document.getElementById('size-filter');
    const rowsFilter = rowsFilterEl ? rowsFilterEl.value : '';
    const typeFilter = document.getElementById('type-filter') ? document.getElementById('type-filter').value : '';

    // Toggle clear search button visibility
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
        if (query.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    // Filter implementation
    filteredDatasets = allDatasets.filter(item => {
        // Search over Name, Grade, Subject, Type, Description
        const matchesSearch = !query || (
            (item.Name && item.Name.toLowerCase().includes(query)) ||
            (item.Grade && item.Grade.toLowerCase().includes(query)) ||
            (item.Subject && item.Subject.toLowerCase().includes(query)) ||
            (item.Type && item.Type.toLowerCase().includes(query)) ||
            (item.Description && item.Description.toLowerCase().includes(query))
        );

        // Specific dropdown filters
        const matchesGrade = !gradeFilter || (item.Grade && item.Grade.toLowerCase().includes(gradeFilter.toLowerCase()));
        const matchesSubject = !subjectFilter || (item.Subject && item.Subject.toLowerCase().includes(subjectFilter.toLowerCase()));
        
        let matchesRows = true;
        if (rowsFilter === 'under-500') {
            matchesRows = typeof item.RowCount === 'number' && item.RowCount < 500;
        } else if (rowsFilter === '500-5000') {
            matchesRows = typeof item.RowCount === 'number' && item.RowCount >= 500 && item.RowCount <= 5000;
        } else if (rowsFilter === 'over-5000') {
            matchesRows = typeof item.RowCount === 'number' && item.RowCount > 5000;
        }

        const matchesType = !typeFilter || (item.Type && item.Type.toLowerCase() === typeFilter.toLowerCase());

        return matchesSearch && matchesGrade && matchesSubject && matchesRows && matchesType;
    });

    // Update UI elements
    const resultsCountEl = document.getElementById('results-count');
    if (resultsCountEl) resultsCountEl.textContent = filteredDatasets.length;
    
    const isFiltered = query !== '' || gradeFilter !== '' || subjectFilter !== '' || rowsFilter !== '' || typeFilter !== '';
    const activeLabelEl = document.getElementById('filter-active-label');
    const resetBtnEl = document.getElementById('reset-filters-btn');
    if (activeLabelEl) activeLabelEl.classList.toggle('hidden', !isFiltered);
    if (resetBtnEl) resetBtnEl.classList.toggle('hidden', !isFiltered);

    renderDatasets();
}

// Clear search input box
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    handleSearchFilter();
}

// Reset all search and filter dropdowns
function resetAllFilters() {
    const searchInput = document.getElementById('search-input');
    const gradeFilter = document.getElementById('grade-filter');
    const subjectFilter = document.getElementById('subject-filter');
    const rowsSelect = document.getElementById('rows-filter') || document.getElementById('size-filter');
    const typeFilter = document.getElementById('type-filter');

    if (searchInput) searchInput.value = '';
    if (gradeFilter) gradeFilter.value = '';
    if (subjectFilter) subjectFilter.value = '';
    if (rowsSelect) rowsSelect.value = '';
    if (typeFilter) typeFilter.value = '';
    handleSearchFilter();
}

// Toggle grid and list views
function setViewMode(mode) {
    viewMode = mode;
    const btnGrid = document.getElementById('btn-grid-view');
    const btnList = document.getElementById('btn-list-view');

    if (btnGrid && btnList) {
        if (mode === 'grid') {
            btnGrid.className = 'px-3 py-2 text-xs font-semibold rounded-lg bg-white shadow-sm text-blue-600 transition flex items-center gap-1.5';
            btnList.className = 'px-3 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
        } else {
            btnList.className = 'px-3 py-2 text-xs font-semibold rounded-lg bg-white shadow-sm text-blue-600 transition flex items-center gap-1.5';
            btnGrid.className = 'px-3 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
        }
    }

    renderDatasets();
}
