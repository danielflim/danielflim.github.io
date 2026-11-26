import { state } from './state.js';
import { colors, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './config.js';
import { loadStandardsData } from './data.js';
import { 
    applyFilter, 
    resetFocus, 
    focusAndAlign, 
    updateStyles, 
    showTooltip, 
    hideTooltip 
} from './layout.js';
import { initSearch } from './search.js';

// Expose focusAndAlign and resetFocus globally on window so inline onclick handlers continue working
window.focusAndAlign = focusAndAlign;
window.resetFocus = resetFocus;

async function initApp() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingProgress = document.getElementById('loading-progress');

    state.width = window.innerWidth;
    state.height = window.innerHeight;

    state.svg = d3.select("#viz");

    // Add marker definition for directed links
    state.svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 12)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#94a3b8");

    state.g = state.svg.append("g");

    // D3 Zoom configuration
    state.zoom = d3.zoom()
        .scaleExtent([0.05, 3])
        .on("zoom", (event) => state.g.attr("transform", event.transform));

    state.svg.call(state.zoom).on("click", (e) => {
        if (e.target.tagName === 'svg') resetFocus();
    });

    try {
        const { nodes, links } = await loadStandardsData((msg) => {
            if (loadingProgress) loadingProgress.innerText = msg;
        });

        state.nodes = nodes;
        state.links = links;

        // Force simulation for overview mode
        state.simulation = d3.forceSimulation(state.nodes)
            .force("link", d3.forceLink(state.links).distance(600).strength(0.1))
            .force("charge", d3.forceManyBody().strength(-8000))
            .force("center", d3.forceCenter(state.width / 2, state.height / 2))
            .force("collision", d3.forceCollide().radius(300));

        const linkLayer = state.g.append("g").attr("class", "links");
        const nodeLayer = state.g.append("g").attr("class", "nodes");

        state.link = linkLayer.selectAll("line").data(state.links).join("line").attr("class", "link");

        state.nodeGroup = nodeLayer.selectAll("g").data(state.nodes).join("g").attr("class", "node-container")
            .on("mouseover", (event, d) => !d.isExpanded && showTooltip(event, d))
            .on("mouseout", hideTooltip)
            .on("click", (event, d) => {
                event.stopPropagation();
                focusAndAlign(d.id);
            });

        state.rects = state.nodeGroup.append("rect")
            .attr("class", "node-rect")
            .attr("width", DEFAULT_WIDTH).attr("height", DEFAULT_HEIGHT)
            .attr("x", -DEFAULT_WIDTH / 2).attr("y", -DEFAULT_HEIGHT / 2)
            .attr("rx", 16)
            .attr("fill", "#ffffff");

        state.foreign = state.nodeGroup.append("foreignObject")
            .attr("width", DEFAULT_WIDTH).attr("height", DEFAULT_HEIGHT)
            .attr("x", -DEFAULT_WIDTH / 2).attr("y", -DEFAULT_HEIGHT / 2);

        const container = state.foreign.append("xhtml:div")
            .attr("class", "node-foreign-wrapper")
            .style("--grade-color", d => colors[d.grade] || "#94a3b8");

        const inner = container.append("div").attr("class", "node-content-padding");

        inner.append("div").attr("class", "node-header").html(d => `
            <span>${d.id}</span>
            <span class="grade-badge">${d.grade}</span>
        `);

        inner.append("div").attr("class", "node-body-text").html(d => d.description || d.domain || d.id);
        state.expandedArea = inner.append("div").attr("class", "expanded-content");

        state.simulation.on("tick", updateStyles);

        // Initialize Search input
        initSearch(focusAndAlign);

        // Hide loading overlay
        loadingOverlay.style.opacity = '0';

        setTimeout(() => {
            loadingOverlay.style.visibility = 'hidden';

            const urlParams = new URLSearchParams(window.location.search);
            const initialCode = urlParams.get('code') || urlParams.get('standard') || window.location.hash.substring(1);

            if (initialCode) {
                const cleanedCode = initialCode.trim();
                const matchedNode = state.nodes.find(n => n.id.toLowerCase() === cleanedCode.toLowerCase());
                if (matchedNode) {
                    state.currentFilter = 'all';
                    focusAndAlign(matchedNode.id);
                } else {
                    applyFilter();
                }
            } else {
                applyFilter();
            }
        }, 500);

    } catch (e) {
        console.error("Initialization Error:", e);
        if (loadingProgress) loadingProgress.innerText = "Error loading data.";
    }
}

// Global mousemove for tooltip
document.addEventListener("mousemove", (e) => {
    const tooltip = document.getElementById("tooltip");
    if (tooltip && tooltip.style.display === "block") {
        tooltip.style.left = (e.clientX + 15) + "px";
        tooltip.style.top = (e.clientY + 15) + "px";
    }
});

// Window resize handling
window.addEventListener('resize', () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    const focused = state.nodes.find(n => n.isExpanded);
    if (focused) {
        focusAndAlign(focused.id);
    } else if (state.simulation) {
        state.simulation.force("center", d3.forceCenter(state.width / 2, state.height / 2)).alpha(0.3).restart();
    }
});

window.addEventListener('DOMContentLoaded', initApp);
