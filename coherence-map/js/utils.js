import { IMG_PREFIX, domainMap, gradeOrder, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './config.js';

export function getGradeFromCode(code, gradeStr) {
    if (gradeStr) {
        const s = gradeStr.trim().toLowerCase();
        if (s.includes('kindergarten') || s === 'k') return 'K';
        const m = s.match(/\d+/);
        if (m) return m[0];
        if (s.includes('hs') || s.includes('high')) return 'HS';
    }
    if (code) {
        const c = code.trim();
        if (c.startsWith('K.') || c.startsWith('K-') || c === 'K') return 'K';
        const m = c.match(/^(\d+)\./);
        if (m) return m[1];
        if (c.startsWith('HS.') || c.startsWith('HSA') || c.startsWith('HSF') || c.startsWith('HSG') || c.startsWith('HSS')) return 'HS';
    }
    return '?';
}

export function inferDomain(code) {
    if (!code) return 'Other';
    const parts = code.split('.');
    if (parts.length >= 2) {
        const d = parts[1];
        if (domainMap[d]) return domainMap[d];
    }
    if (code.includes('G-')) return 'Geometry';
    return 'Other';
}

export function getGradeWeight(g) {
    return gradeOrder[g] !== undefined ? gradeOrder[g] : 99;
}

export function fixImagePaths(html) {
    if (!html) return "";
    return html.replace(/src=["'](?!(?:https?:\/\/))([^"']+)["']/gi, (match, p1) => {
        return `src="${IMG_PREFIX}${p1}"`;
    });
}

export function getIntersection(rect, other) {
    const w = (rect.displayW || DEFAULT_WIDTH) / 2;
    const h = (rect.displayH || DEFAULT_HEIGHT) / 2;
    const dx = other.x - rect.x;
    const dy = other.y - rect.y;
    if (dx === 0 && dy === 0) return { x: rect.x, y: rect.y };
    const tanPhi = h / w;
    const tanTheta = Math.abs(dy / dx);
    let qx, qy;
    if (tanTheta <= tanPhi) {
        qx = w * Math.sign(dx);
        qy = qx * (dy / dx);
    } else {
        qy = h * Math.sign(dy);
        qx = qy * (dx / dy);
    }
    return { x: rect.x + qx, y: rect.y + qy };
}
