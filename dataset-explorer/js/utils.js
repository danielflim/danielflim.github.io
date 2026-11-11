/**
 * utils.js - Formatting, badges, clipboard and feedback helper functions
 */

// Helper: Format and render HTML content safely with interactive links
function formatHtmlContent(raw) {
    if (raw === undefined || raw === null) return '';
    let content = String(raw).trim();
    if (!content) return '';

    // If the content contains escaped HTML tags like &lt;a, &lt;p, &lt;b, &lt;i, etc., unescape them
    if (content.includes('&lt;') && content.includes('&gt;')) {
        const temp = document.createElement('div');
        temp.innerHTML = content;
        if (temp.textContent && (temp.innerHTML.includes('<') || temp.textContent.includes('<'))) {
            content = temp.textContent;
        }
    }

    // Convert raw newlines to <br> if no HTML block tags are detected
    const hasBlockTags = /<(?:p|div|br|ul|ol|li|table|h[1-6]|blockquote)\b[^>]*>/i.test(content);
    if (!hasBlockTags && content.includes('\n')) {
        content = content.replace(/\r\n|\n|\r/g, '<br>');
    }

    // Ensure any <a> tags open in new tab and have proper styling
    const container = document.createElement('div');
    container.innerHTML = content;
    const links = container.querySelectorAll('a');
    links.forEach(a => {
        if (!a.getAttribute('target')) {
            a.setAttribute('target', '_blank');
        }
        if (!a.getAttribute('rel')) {
            a.setAttribute('rel', 'noopener noreferrer');
        }
        a.classList.add('text-blue-600', 'hover:text-blue-800', 'underline', 'font-medium', 'transition');
    });

    return container.innerHTML;
}

// Helper: Generate Row Count Badge HTML
function getRowCountBadgeHTML(rowCount) {
    if (rowCount === undefined || rowCount === null || rowCount === '') return '';
    const num = typeof rowCount === 'number' ? rowCount : parseInt(String(rowCount).replace(/[^0-9]/g, ''), 10);
    const label = !isNaN(num) && num >= 0 ? `${num.toLocaleString()} rows` : String(rowCount);

    return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5" title="Dataset Size: ${label}">
        <i class="fa-solid fa-table-list text-[10px] text-slate-500"></i> ${label}
    </span>`;
}

// Backward compatibility alias
function getSizeBadgeHTML(val) {
    return getRowCountBadgeHTML(val);
}

// Helper: Generate Type Badge HTML
function getTypeBadgeHTML(type) {
    if (!type || type.trim() === '') return '';
    const cleanType = type.trim();
    const isModel = cleanType.toLowerCase() === 'model';
    const isDist = cleanType.toLowerCase() === 'distribution';
    
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let iconClass = 'fa-solid fa-tag';

    if (isModel) {
        badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
        iconClass = 'fa-solid fa-cube';
    } else if (isDist) {
        badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
        iconClass = 'fa-solid fa-chart-simple';
    }

    return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${badgeClass} border inline-flex items-center gap-1" title="Dataset Type: ${cleanType}">
        <i class="${iconClass} text-[10px]"></i> ${cleanType}
    </span>`;
}

// Helper: Parse Comma Delimited String into Badges
function createCommaBadges(str, colorClass = 'bg-slate-100 text-slate-700') {
    if (!str) return '<span class="text-slate-400 italic">None</span>';
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return '<span class="text-slate-400 italic">None</span>';
    return items.map(item => `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium ${colorClass} border border-slate-200">${formatHtmlContent(item)}</span>`).join(' ');
}

// Helper: Format pipe delimited string into an unordered or ordered list
function formatPipeUnorderedList(str, isNumbered = false) {
    if (!str) return '<p class="text-slate-400 italic">None specified</p>';
    const items = str.split('|').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return '<p class="text-slate-400 italic">None specified</p>';

    const tag = isNumbered ? 'ol' : 'ul';
    const listClass = isNumbered ? 'list-decimal list-inside space-y-1' : 'space-y-1.5';
    
    const lis = items.map(item => `
        <li class="flex items-start gap-2">
            <span class="text-blue-500 font-bold">•</span>
            <span class="leading-relaxed">${formatHtmlContent(item)}</span>
        </li>
    `).join('');

    return `<${tag} class="${listClass}">${lis}</${tag}>`;
}

// Helper: Copy string to clipboard with fallback
function copyStringToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
        return Promise.resolve();
    }
}

// Helper: Fallback copy mechanism using textarea
function fallbackCopy(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    temp.style.top = '-9999px';
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try {
        document.execCommand('copy');
    } catch (e) {
        console.error('execCommand copy error:', e);
    }
    document.body.removeChild(temp);
}

// Helper: Visual feedback for action buttons
function flashButtonFeedback(btnEl, message, isError = false) {
    if (!btnEl) return;
    const originalHTML = btnEl.getAttribute('data-orig-html') || '<i class="fa-solid fa-chart-column"></i> <span>Desmos</span>';
    if (!btnEl.getAttribute('data-orig-html')) {
        btnEl.setAttribute('data-orig-html', originalHTML);
    }

    if (isError) {
        btnEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-200"></i> <span>${message}</span>`;
        btnEl.classList.remove('bg-emerald-600', 'hover:bg-emerald-500', 'bg-blue-600', 'hover:bg-blue-500');
        btnEl.classList.add('bg-amber-600');
    } else {
        btnEl.innerHTML = `<i class="fa-solid fa-clipboard-check text-white"></i> <span>${message}</span>`;
        btnEl.classList.remove('bg-emerald-600', 'hover:bg-emerald-500', 'bg-amber-600');
        btnEl.classList.add('bg-blue-600', 'hover:bg-blue-500');
    }

    setTimeout(() => {
        btnEl.innerHTML = originalHTML;
        btnEl.classList.remove('bg-blue-600', 'hover:bg-blue-500', 'bg-amber-600');
        btnEl.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        btnEl.disabled = false;
    }, 4000);
}
