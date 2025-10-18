let simulation, svg, g, nodeGroup, linkGroup, linkLabelGroup;
let width, height;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
let onNodeClickCallback;
let onNodeRightClickCallback;
let onBackgroundClickCallback;
let zoomStartTransform; 

function render(state) {
    const { graphData, isSelectionMode } = state;

    _renderNodes(graphData.nodes, isSelectionMode);
    _renderLinks(graphData.links);
    _renderLinkLabels(graphData.links);

    simulation.nodes(graphData.nodes);
    simulation.force("link").links(graphData.links);
    simulation.alpha(0.3).restart(); 
}

function _renderNodes(nodesData, isSelectionMode) {
    const node = nodeGroup.selectAll(".node")
        .data(nodesData, d => d.id)
        .join("g")
        .attr("class", d => {
            let classes = "node";
            if (isSelectionMode && !d.isCandidate) classes += " disabled";
            if (d.isQueued) classes += " queued";
            return classes;
        })
        .call(_createDragBehavior())
        .on("contextmenu", (event, d) => {
            event.preventDefault(); 
            if (onNodeRightClickCallback) {
                onNodeRightClickCallback(d.id);
            }
        });

    node.selectAll("*").remove();

    node.append("circle")
        .attr("r", d => d.isCandidate ? 25 : 18)
        .style("fill", d => d.isCandidate ? "deeppink" : colorScale(d.id));

    node.append("text")
        .text(d => d.id)
        .attr("dy", d => d.isCandidate ? -33 : -26);
}

function _renderLinks(linksData) {
    linkGroup.selectAll("line")
        .data(linksData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
        .join("line")
        .attr("class", "link")
        .style("stroke-width", d => d.isCandidate ? '4px' : '2.5px')
        .style("stroke-dasharray", d => d.isCandidate ? "10, 5" : "none")
        .attr("marker-end", "url(#arrowhead)");
}

function _renderLinkLabels(linksData) {
     linkLabelGroup.selectAll(".link-label")
        .data(linksData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
        .join("text")
        .attr("class", "link-label")
        .text(d => d.label);
}

function _onSimulationTick() {
    nodeGroup.selectAll(".node").attr("transform", d => `translate(${d.x}, ${d.y})`);

    linkGroup.selectAll("line")
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    
    linkLabelGroup.selectAll(".link-label")
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
}

function _createDragBehavior() {
    let dragStartPosition;
    function dragstarted(event) {
        event.sourceEvent.stopPropagation(); 
        if (!event.active) simulation.alphaTarget(0.3).restart();
        dragStartPosition = { x: event.x, y: event.y };
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);

        const dx = event.x - dragStartPosition.x;
        const dy = event.y - dragStartPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clickTolerance = 5; 

        if (distance < clickTolerance) {
            if (onNodeClickCallback) onNodeClickCallback(event, event.subject);
            event.subject.fx = dragStartPosition.x;
            event.subject.fy = dragStartPosition.y;
        } else {
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}

export const graphView = {
    init: (containerSelector, { onNodeClick, onNodeRightClick, onBackgroundClick }) => {
        onNodeClickCallback = onNodeClick;
        onNodeRightClickCallback = onNodeRightClick;
        onBackgroundClickCallback = onBackgroundClick; 

        svg = d3.select(containerSelector);
        width = svg.node().getBoundingClientRect().width;
        height = svg.node().getBoundingClientRect().height;

        g = svg.append("g");
        linkGroup = g.append("g").attr("class", "links");
        linkLabelGroup = g.append("g").attr("class", "link-labels");
        nodeGroup = g.append("g").attr("class", "nodes");
        
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10')
            .attr('refX', 23).attr('refY', 0).attr('orient', 'auto')
            .attr('markerWidth', 8).attr('markerHeight', 8)
            .append('svg:path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#999');

        simulation = d3.forceSimulation()
            .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
            .force("collide", d3.forceCollide().radius(80))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("link", d3.forceLink().id(d => d.id).distance(150))
            .force("radial", d3.forceRadial(200, width / 2, height / 2).strength(0.1))
            .on("tick", _onSimulationTick);


        const zoom = d3.zoom()
            .scaleExtent([0.5, 4])
            .translateExtent([[0, 0], [width, height]])
            .on("start", (event) => {
                if (event.sourceEvent && event.sourceEvent.target === svg.node()) {
                    zoomStartTransform = event.transform;
                }
            })
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            })
            .on("end", (event) => {
                if (!zoomStartTransform) {
                    return; 
                }

                const isClick = zoomStartTransform.k === event.transform.k &&
                                zoomStartTransform.x === event.transform.x &&
                                zoomStartTransform.y === event.transform.y;

                if (isClick && onBackgroundClickCallback) {
                    onBackgroundClickCallback();
                }

                zoomStartTransform = null;
            });
        
        svg.call(zoom);
    },

    render: (graphData, isSelectionMode) => {
        render({ graphData, isSelectionMode });
    }
};