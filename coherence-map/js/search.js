import { state } from './state.js';
import { colors } from './config.js';

export function initSearch(onSelectNode) {
    const searchInput = document.getElementById('search');
    const searchResults = document.getElementById('searchResults');
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const term = e.target.value.toLowerCase().trim();
        
        if (!term) { 
            searchResults.style.display = 'none'; 
            return; 
        }

        searchTimeout = setTimeout(() => {
            const matches = state.nodes.filter(d => 
                d.id.toLowerCase().includes(term) || 
                (d.description && d.description.toLowerCase().includes(term)) ||
                (d.domain && d.domain.toLowerCase().includes(term)) ||
                (d.cluster && d.cluster.toLowerCase().includes(term))
            ).slice(0, 15);

            searchResults.style.display = 'block';
            
            searchResults.innerHTML = matches.map(m => {
                const descText = m.description || m.domain || m.id;
                const snippet = descText.substring(0, 150) + (descText.length > 150 ? '...' : '');
                return `
                    <div class="search-result-item" data-id="${m.id}">
                        <div class="flex justify-between items-center mb-1">
                            <b class="text-slate-900 text-sm">${m.id}</b>
                            <span class="grade-badge" style="background:${colors[m.grade] || '#94a3b8'}">${m.grade}</span>
                        </div>
                        <div class="text-[10px] text-blue-600 font-semibold mb-0.5">${m.domain}</div>
                        <div class="text-[11px] text-slate-500 leading-normal math-content">${snippet}</div>
                    </div>
                `;
            }).join('');

            if (window.MathJax) {
                MathJax.typesetPromise([searchResults]);
            }
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.onclick = () => {
                    onSelectNode(item.dataset.id);
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                };
            });
        }, 150);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}
