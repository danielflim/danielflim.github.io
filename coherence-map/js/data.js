import { MAPPING_URL, CONTENT_BASE_URL, CONTENT_SHEETS, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './config.js';
import { getGradeFromCode, inferDomain, fixImagePaths } from './utils.js';

export async function loadStandardsData(onProgress) {
    if (onProgress) onProgress("Connecting to Database...");

    const [mappingRes, ...contentResponses] = await Promise.all([
        fetch(MAPPING_URL),
        ...CONTENT_SHEETS.map(s => fetch(CONTENT_BASE_URL + s.gid))
    ]);

    if (onProgress) onProgress("Parsing Records...");
    const mappingCsv = await mappingRes.text();
    const contentTsvs = await Promise.all(contentResponses.map(r => r.text()));

    const rawMapping = d3.csvParse(mappingCsv);
    let rawContent = [];
    contentTsvs.forEach(tsv => {
        rawContent = rawContent.concat(d3.tsvParse(tsv));
    });

    const mappingData = new Map();
    rawMapping.forEach(row => {
        const origin = (row.Code_Origin || row['Code_Origin'] || '').trim();
        if (!origin) return;

        const destStr = (row.Code_Dest_List || row['Code_Dest_List'] || '').trim();
        const parts = destStr.split(':');

        const parseCodes = (s) => {
            if (!s) return [];
            return s.split(',')
                .map(item => item.trim().split(/\s+/)[0])
                .filter(code => code && code !== '-' && !code.startsWith('-') && !code.includes('?'));
        };

        const supports = parseCodes(parts[0]);
        const related = parts.length > 1 ? parseCodes(parts[1]) : [];

        mappingData.set(origin, { supports, related });
    });

    const contentMap = new Map();
    rawContent.forEach(r => {
        const code = (r.Code || '').trim();
        if (code) contentMap.set(code, r);
    });

    const allCodes = new Set();
    contentMap.forEach((_, code) => allCodes.add(code));
    mappingData.forEach((mapObj, origin) => {
        allCodes.add(origin);
        mapObj.supports.forEach(c => allCodes.add(c));
        mapObj.related.forEach(c => allCodes.add(c));
    });

    const parsePipeList = (val) => {
        if (!val) return [];
        return val.split('|')
            .map(s => fixImagePaths(s.trim()))
            .filter(s => s && s.toLowerCase() !== 'none');
    };

    const nodes = Array.from(allCodes).map((code, i) => {
        const cData = contentMap.get(code) || {};
        const mMap = mappingData.get(code) || { supports: [], related: [] };

        const grade = getGradeFromCode(code, cData.Grade);
        const domain = (cData.Domain || '').trim() || inferDomain(code);
        const cluster = (cData.Cluster || '').trim();

        let startPos;
        if (i < 8) {
            const angle = (i / 8) * 2 * Math.PI;
            startPos = { x: Math.cos(angle) * 350, y: Math.sin(angle) * 350 };
        } else {
            const angle = Math.random() * 2 * Math.PI;
            const r = 2500 + Math.random() * 1000;
            startPos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        }

        return {
            id: code,
            grade: grade,
            domain: domain,
            cluster: cluster,
            description: fixImagePaths(cData.Description || ""),
            clarifications: parsePipeList(cData.Clarifications),
            limitations: parsePipeList(cData.Limitations),
            examples: parsePipeList(cData.Examples),
            learning_opps: parsePipeList(cData['Student Learning Opportunities (SLOs)'] || cData['Student Learning Opportunities']),
            rationale: (cData.Rationale || '').trim(),
            supports: mMap.supports,
            related: mMap.related,
            x: startPos.x,
            y: startPos.y,
            displayW: DEFAULT_WIDTH,
            displayH: DEFAULT_HEIGHT
        };
    }).filter(d => d.id);

    if (onProgress) onProgress("Building Coherence Graph...");
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = [];

    nodes.forEach(node => {
        node.supports.forEach(destId => {
            if (nodeMap.has(destId)) {
                links.push({
                    source: node,
                    target: nodeMap.get(destId),
                    type: 'supports',
                    topic: node.domain
                });
            }
        });
    });

    return { nodes, links };
}
