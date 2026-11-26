import { state } from './state.js';
import { colors, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './config.js';
import { getGradeWeight, getIntersection } from './utils.js';

export function showTooltip(event, d) {
    const tooltip = d3.select("#tooltip");
    tooltip.style("display", "block").html(`
        <div class="mb-2"><span class="grade-badge" style="background:${colors[d.grade] || '#000'}">${d.grade}</span></div>
        <div class="font-black text-sm text-slate-900 mb-1">${d.id}</div>
        <div class="text-[10px] text-blue-600 font-semibold mb-1">${d.domain}</div>
        <div class="text-[11px] text-slate-500 leading-relaxed line-clamp-3">${d.description || d.domain || d.id}</div>
        <div class="mt-3 text-[9px] text-blue-600 font-bold tracking-widest border-t pt-2">CLICK TO FOCUS</div>
    `);
    if (window.MathJax) MathJax.typesetPromise([tooltip.node()]);
}

export function hideTooltip() { 
    d3.select("#tooltip").style("display", "none"); 
}

export function updateLinks() {
    const focused = state.nodes.find(n => n.isExpanded);
    state.link.each(function(d) {
        let isHidden = false;
        if (focused) {
            // Only show direct links between the focused node and its visible 1-level neighbors
            isHidden = (d.source.id !== focused.id && d.target.id !== focused.id);
        } else if (state.currentFilter !== 'all') {
            isHidden = (d.source.domain !== state.currentFilter || d.target.domain !== state.currentFilter);
        }

        d3.select(this).classed('hidden-link', isHidden);
        if (isHidden) return;

        const sourcePoint = getIntersection(d.source, d.target);
        const targetPoint = getIntersection(d.target, d.source);
        d3.select(this)
            .attr("x1", sourcePoint.x).attr("y1", sourcePoint.y)
            .attr("x2", targetPoint.x).attr("y2", targetPoint.y);
    });
}

export function updateStyles() {
    state.nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    state.rects.attr("width", d => d.displayW).attr("height", d => d.displayH)
        .attr("x", d => -d.displayW/2).attr("y", d => -d.displayH/2);
    state.foreign.attr("width", d => d.displayW).attr("height", d => d.displayH)
        .attr("x", d => -d.displayW/2).attr("y", d => -d.displayH/2);
    updateLinks();
}

export function animateLayout(duration, focusId = null, tW = DEFAULT_WIDTH, tH = DEFAULT_HEIGHT) {
    const startTime = performance.now();
    const startStates = new Map(state.nodes.map(n => [n.id, { 
        x: n.x, y: n.y, 
        w: n.displayW || DEFAULT_WIDTH, 
        h: n.displayH || DEFAULT_HEIGHT 
    }]));

    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = d3.easeCubicInOut(progress);

        state.nodes.forEach(n => {
            const start = startStates.get(n.id);
            if (!start) return;
            n.x = start.x + (n.tx - start.x) * ease;
            n.y = start.y + (n.ty - start.y) * ease;
            
            if (focusId && n.id === focusId) {
                n.displayW = start.w + (tW - start.w) * ease;
                n.displayH = start.h + (tH - start.h) * ease;
            } else {
                n.displayW = start.w + (DEFAULT_WIDTH - start.w) * ease;
                n.displayH = start.h + (DEFAULT_HEIGHT - start.h) * ease;
            }
            n.fx = n.x; n.fy = n.y;
        });

        updateStyles();

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else if (window.MathJax) {
            MathJax.typesetPromise();
        }
    }
    requestAnimationFrame(frame);
}

export function zoomToFitNodes(targetNodes) {
    if (!targetNodes || targetNodes.length === 0) return;
    
    let minX = d3.min(targetNodes, d => (d.tx !== undefined ? d.tx : d.x) - (d.displayW || DEFAULT_WIDTH)/2);
    let maxX = d3.max(targetNodes, d => (d.tx !== undefined ? d.tx : d.x) + (d.displayW || DEFAULT_WIDTH)/2);
    let minY = d3.min(targetNodes, d => (d.ty !== undefined ? d.ty : d.y) - (d.displayH || DEFAULT_HEIGHT)/2);
    let maxY = d3.max(targetNodes, d => (d.ty !== undefined ? d.ty : d.y) + (d.displayH || DEFAULT_HEIGHT)/2);
    
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
        return;
    }

    const dx = maxX - minX;
    const dy = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    const padding = 100;
    const scaleX = (state.width - padding * 2) / Math.max(dx, 1);
    const scaleY = (state.height - padding * 2) / Math.max(dy, 1);
    let scale = Math.min(scaleX, scaleY);
    
    scale = Math.max(0.08, Math.min(scale, 1.2));
    
    const transform = d3.zoomIdentity
        .translate(state.width / 2, state.height / 2)
        .scale(scale)
        .translate(-cx, -cy);
        
    state.svg.transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .call(state.zoom.transform, transform);
}

export function applyFilter() {
    const focused = state.nodes.find(n => n.isExpanded);
    
    if (focused) {
        state.simulation.nodes(state.nodes);
        state.simulation.force("link").links(state.links);
        state.nodeGroup.classed("hidden-node", false);
        updateLinks();
        focusAndAlign(focused.id);
        return;
    }

    state.simulation.stop();

    let activeNodes, activeLinks;
    if (state.currentFilter === 'all') {
        activeNodes = state.nodes;
        activeLinks = state.links;

        state.nodes.forEach(n => {
            n.fx = null;
            n.fy = null;
        });

        state.simulation.nodes(activeNodes);
        state.simulation.force("link").links(activeLinks);
        
        state.nodeGroup.classed("hidden-node", false);
        state.nodeGroup.classed("dimmed", false);
        state.link.classed("dimmed", false);
        updateLinks();

        state.simulation.alpha(0.8).restart();
        
        setTimeout(() => {
            zoomToFitNodes(activeNodes);
        }, 300);
    } else {
        activeNodes = state.nodes.filter(n => n.domain === state.currentFilter);
        const activeIds = new Set(activeNodes.map(n => n.id));
        activeLinks = state.links.filter(l => activeIds.has(l.source.id) && activeIds.has(l.target.id));

        const activeGrades = Array.from(new Set(activeNodes.map(n => n.grade)))
            .sort((a, b) => getGradeWeight(a) - getGradeWeight(b));

        const gradeColumns = new Map();
        activeGrades.forEach(g => gradeColumns.set(g, []));
        activeNodes.forEach(n => {
            gradeColumns.get(n.grade).push(n);
        });

        gradeColumns.forEach((colNodes) => {
            colNodes.sort((a, b) => a.id.localeCompare(b.id));
        });

        const centerX = state.width / 2;
        const centerY = state.height / 2;
        const spacingX = DEFAULT_WIDTH + 140;
        const spacingY = DEFAULT_HEIGHT + 50;

        const k = activeGrades.length;

        state.nodes.forEach(n => {
            if (activeNodes.includes(n)) {
                const colIdx = activeGrades.indexOf(n.grade);
                const colNodes = gradeColumns.get(n.grade);
                const rowIdx = colNodes.indexOf(n);
                const m = colNodes.length;

                n.tx = centerX + (colIdx - (k - 1) / 2) * spacingX;
                n.ty = centerY + (rowIdx - (m - 1) / 2) * spacingY;
            } else {
                const angle = Math.random() * 2 * Math.PI;
                n.tx = centerX + Math.cos(angle) * 5000;
                n.ty = centerY + Math.sin(angle) * 5000;
            }
            n.fx = n.tx;
            n.fy = n.ty;
        });

        state.nodeGroup.classed("hidden-node", n => !activeNodes.includes(n));
        state.nodeGroup.classed("dimmed", false);
        state.link.classed("dimmed", false);

        animateLayout(800);
        zoomToFitNodes(activeNodes);
    }
}

export function resetFocus() {
    if (!state.nodes.length || !state.simulation) return;
    state.nodes.forEach(n => {
        n.fx = null; n.fy = null;
        n.isExpanded = false;
        n.displayW = DEFAULT_WIDTH;
        n.displayH = DEFAULT_HEIGHT;
    });
    
    state.nodeGroup.select(".node-header").html(d => `
        <span>${d.id}</span>
        <span class="grade-badge">${d.grade}</span>
    `);

    state.nodeGroup.classed("dimmed", false).classed("is-expanded", false).classed("hidden-node", false);
    state.rects.classed("focused-node", false);
    state.link.classed("dimmed", false).classed("hidden-link", false);
    state.expandedArea.html("");
    
    applyFilter();
    updateStyles();
}

export function focusAndAlign(nodeId) {
    const centerNode = state.nodes.find(n => n.id === nodeId);
    if (!centerNode || !state.simulation) return;

    state.simulation.stop();
    hideTooltip();

    state.nodes.forEach(n => { n.isExpanded = false; n.fx = n.x; n.fy = n.y; });
    centerNode.isExpanded = true;
    
    state.nodeGroup.filter(d => d.id === nodeId).raise();
    state.rects.classed("focused-node", d => d.id === nodeId);

    // Make the enlarged card much larger and prominent
    const targetWidth = Math.min(Math.max(state.width * 0.52, 650), 920);
    
    let detailHTML = '';
    const section = (title, items) => {
        if (!items || !items.length) return '';
        return `
            <div class="mt-6">
                <b class="text-xs uppercase tracking-wider text-slate-400 font-bold">${title}</b>
                <ul class="list-disc pl-5 text-sm mt-2 space-y-2 text-slate-600">
                    ${items.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
        `;
    };

    // Domain & Cluster header
    detailHTML += `
        <div class="mt-4 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs uppercase tracking-wider text-slate-400 font-bold">Domain:</span>
                <span class="text-sm font-bold text-blue-600">${centerNode.domain}</span>
            </div>
            ${centerNode.cluster ? `
            <div class="flex items-baseline gap-2 mt-1">
                <span class="text-xs uppercase tracking-wider text-slate-400 font-bold">Cluster:</span>
                <span class="text-xs text-slate-600 font-medium">${centerNode.cluster}</span>
            </div>` : ''}
        </div>
    `;

    // Prerequisites (nodes that directly support centerNode: 1 level)
    const prereqNodes = state.nodes.filter(n => n.supports && n.supports.includes(centerNode.id));
    if (prereqNodes.length > 0) {
        detailHTML += `
            <div class="mt-4 pb-4 border-b border-slate-100">
                <b class="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">Prerequisites (Supported By)</b>
                <div class="flex flex-wrap gap-1.5">
                    ${prereqNodes.map(p => `<button onclick="event.stopPropagation(); focusAndAlign('${p.id}')" class="text-xs px-2.5 py-1 font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md border border-indigo-200 transition cursor-pointer">${p.id}</button>`).join('')}
                </div>
            </div>
        `;
    }

    // Directly Supports (standards centerNode directly supports: 1 level)
    const supportNodes = (centerNode.supports || []).map(id => state.nodes.find(n => n.id === id)).filter(Boolean);
    if (supportNodes.length > 0) {
        detailHTML += `
            <div class="mt-4 pb-4 border-b border-slate-100">
                <b class="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">Directly Supports</b>
                <div class="flex flex-wrap gap-1.5">
                    ${supportNodes.map(s => `<button onclick="event.stopPropagation(); focusAndAlign('${s.id}')" class="text-xs px-2.5 py-1 font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition cursor-pointer">${s.id}</button>`).join('')}
                </div>
            </div>
        `;
    }

    // Related standards (from mapping if any)
    const relatedList = Array.from(new Set([
        ...(centerNode.related || []),
        ...state.nodes.filter(n => n.related && n.related.includes(centerNode.id)).map(n => n.id)
    ]));
    if (relatedList.length > 0) {
        detailHTML += `
            <div class="mt-4 pb-4 border-b border-slate-100">
                <b class="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2">Related Standards</b>
                <div class="flex flex-wrap gap-1.5">
                    ${relatedList.map(c => `<button onclick="event.stopPropagation(); focusAndAlign('${c}')" class="text-xs px-2.5 py-1 font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md border border-blue-100/50 transition cursor-pointer">${c}</button>`).join('')}
                </div>
            </div>
        `;
    }

    detailHTML += section('Clarifications', centerNode.clarifications);
    detailHTML += section('Limitations', centerNode.limitations);
    detailHTML += section('Student Learning Opportunities', centerNode.learning_opps);
    detailHTML += section('Examples', centerNode.examples);
    if (centerNode.rationale) {
        detailHTML += `
            <div class="mt-6">
                <b class="text-xs uppercase tracking-wider text-slate-400 font-bold">Rationale</b>
                <p class="text-sm mt-2 text-slate-600 leading-relaxed">${centerNode.rationale}</p>
            </div>
        `;
    }
    
    // Accurately measure the expanded card height
    const measure = d3.select("body").append("div")
        .attr("class", "node-foreign-wrapper is-expanded")
        .style("width", targetWidth + "px")
        .style("position", "absolute")
        .style("top", "0").style("left", "0")
        .style("visibility", "hidden")
        .style("--grade-color", colors[centerNode.grade] || "#94a3b8")
        .html(`
            <div class="node-content-padding" style="padding: 20px 24px;">
                <div class="node-header" style="font-size: 20px; padding-bottom: 8px; margin-bottom: 12px;">
                    <span>${centerNode.id}</span>
                    <span class="grade-badge" style="font-size: 11px; padding: 3px 10px;">${centerNode.grade}</span>
                </div>
                <div class="node-body-text" style="-webkit-line-clamp:unset; font-size:15px; line-height: 1.6; color: #1e3a8a;">${centerNode.description || centerNode.domain || centerNode.id}</div>
                <div class="expanded-content" style="display:block; opacity:1;">${detailHTML}</div>
            </div>
        `);
    
    const measuredHeight = measure.select('.node-content-padding').node().getBoundingClientRect().height;
    const bottomPadding = Math.min(Math.max(measuredHeight * 0.08, 24), 48);
    const targetHeight = measuredHeight + bottomPadding;
    measure.remove();

    // ONLY one level of connections to neighbor standards are visible:
    // 1) Prerequisites (nodes directly supporting centerNode) -> Left
    // 2) Center standard -> Front and Center
    // 3) Standards directly supported by centerNode -> Right
    const visibleIds = new Set([centerNode.id]);
    prereqNodes.forEach(n => visibleIds.add(n.id));
    supportNodes.forEach(n => visibleIds.add(n.id));

    // Sort column cards by grade progression and standard code
    prereqNodes.sort((a, b) => {
        const wa = getGradeWeight(a.grade);
        const wb = getGradeWeight(b.grade);
        if (wa !== wb) return wa - wb;
        return a.id.localeCompare(b.id);
    });

    supportNodes.sort((a, b) => {
        const wa = getGradeWeight(a.grade);
        const wb = getGradeWeight(b.grade);
        if (wa !== wb) return wa - wb;
        return a.id.localeCompare(b.id);
    });

    const centerX = state.width / 2;
    const centerY = state.height / 2;
    const spacingX = (targetWidth / 2) + (DEFAULT_WIDTH / 2) + 70;

    const targetCoords = new Map();

    // Center Node: placed FRONT AND CENTER
    targetCoords.set(centerNode.id, { tx: centerX, ty: centerY });

    // Prerequisites Column (Level -1, left of center)
    if (prereqNodes.length > 0) {
        const gap = 20;
        const totalHeight = prereqNodes.length * DEFAULT_HEIGHT + (prereqNodes.length - 1) * gap;
        let currentY = centerY - totalHeight / 2;
        prereqNodes.forEach(n => {
            targetCoords.set(n.id, {
                tx: centerX - spacingX,
                ty: currentY + DEFAULT_HEIGHT / 2
            });
            currentY += DEFAULT_HEIGHT + gap;
        });
    }

    // Directly Supports Column (Level +1, right of center)
    if (supportNodes.length > 0) {
        const gap = 20;
        const totalHeight = supportNodes.length * DEFAULT_HEIGHT + (supportNodes.length - 1) * gap;
        let currentY = centerY - totalHeight / 2;
        supportNodes.forEach(n => {
            targetCoords.set(n.id, {
                tx: centerX + spacingX,
                ty: currentY + DEFAULT_HEIGHT / 2
            });
            currentY += DEFAULT_HEIGHT + gap;
        });
    }

    // Assign target coordinates to all nodes
    state.nodes.forEach(n => {
        if (visibleIds.has(n.id)) {
            const coords = targetCoords.get(n.id);
            n.tx = coords.tx;
            n.ty = coords.ty;
        } else {
            n.tx = centerX;
            n.ty = centerY;
        }
        n.fx = n.tx;
        n.fy = n.ty;
    });

    // Update node header with prominent title and close button
    state.nodeGroup.filter(d => d.id === nodeId).select(".node-header").html(`
        <div class="flex items-center gap-2">
            <span class="text-xl font-black">${centerNode.id}</span>
            <span class="grade-badge text-xs px-2.5 py-0.5">${centerNode.grade}</span>
        </div>
        <button onclick="event.stopPropagation(); resetFocus()" class="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full w-7 h-7 inline-flex items-center justify-center text-base font-bold transition cursor-pointer" title="Close">✕</button>
    `);

    state.nodeGroup.filter(d => d.id !== nodeId).select(".node-header").html(d => `
        <span>${d.id}</span>
        <span class="grade-badge">${d.grade}</span>
    `);

    state.nodeGroup.classed("is-expanded", n => n.id === nodeId);
    state.expandedArea.filter(d => d.id === nodeId).html(detailHTML);
    state.expandedArea.filter(d => d.id !== nodeId).html("");

    // Only 1 level of connections to neighbor standards are visible; all others hidden
    state.nodeGroup.classed("hidden-node", n => !visibleIds.has(n.id));
    state.nodeGroup.classed("dimmed", false);
    state.link.classed("dimmed", false);

    animateLayout(800, nodeId, targetWidth, targetHeight);

    // Compute symmetric viewport framing to keep the enlarged card dead center on screen
    let maxHalfW = targetWidth / 2;
    let maxHalfH = targetHeight / 2;

    if (prereqNodes.length > 0) {
        maxHalfW = Math.max(maxHalfW, spacingX + DEFAULT_WIDTH / 2);
        const prereqH = prereqNodes.length * DEFAULT_HEIGHT + (prereqNodes.length - 1) * 20;
        maxHalfH = Math.max(maxHalfH, prereqH / 2);
    }
    if (supportNodes.length > 0) {
        maxHalfW = Math.max(maxHalfW, spacingX + DEFAULT_WIDTH / 2);
        const supportH = supportNodes.length * DEFAULT_HEIGHT + (supportNodes.length - 1) * 20;
        maxHalfH = Math.max(maxHalfH, supportH / 2);
    }

    const paddingX = 80;
    const paddingY = 80;
    const scaleX = (state.width - paddingX * 2) / (2 * maxHalfW);
    const scaleY = (state.height - paddingY * 2) / (2 * maxHalfH);
    let scale = Math.min(scaleX, scaleY);
    scale = Math.max(0.45, Math.min(scale, 1.05));

    const transform = d3.zoomIdentity
        .translate(state.width / 2, state.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

    state.svg.transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .call(state.zoom.transform, transform);
}
