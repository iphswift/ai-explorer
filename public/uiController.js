import { appState } from './appState.js';
import { apiService } from './apiService.js';

const elements = {};
let originalResponseButtonText = '';
let originalQueryButtonText = '';
elements.undoButton = document.getElementById('undo-button');
elements.redoButton = document.getElementById('redo-button');

function _getNodeId(node) {
    return typeof node === 'object' ? node.id : node;
}

async function _fetchAndDisplaySuggestions(d) {
    setQueryLoading(true, 'Finding suggestions...');
    try {
        const { knowledgeGraph, graphData, dismissedTermsMap } = appState.getState();
        
        graphData.nodes.forEach(node => {
            node.fx = null;
            node.fy = null;
        });

        const existingNodes = graphData.nodes
            .filter(n => !n.isCandidate)
            .map(n => ({...n})); 
            
        const existingLinks = graphData.links
            .filter(l => !l.isCandidate)
            .map(l => ({
                ...l, 
                source: _getNodeId(l.source), 
                target: _getNodeId(l.target)
            }));

        const dismissed = dismissedTermsMap[d.id];
        let suggestions;
        let newDismissedTermsMap = { ...dismissedTermsMap };

        if (dismissed && dismissed.length > 0) {
            suggestions = await apiService.fetchAlternativeSuggestions(knowledgeGraph, dismissed);
            delete newDismissedTermsMap[d.id];
            } else {
            suggestions = await apiService.fetchSuggestions(knowledgeGraph, d.id);
        }
        
        const newCandidateNodes = suggestions.terms.map((newTerm) => {
             if (existingNodes.some(n => n.id === newTerm)) return null;
             return { id: newTerm, isCandidate: true, isQueued: false, x: d.x, y: d.y };
        }).filter(Boolean);

        const newCandidateLinks = newCandidateNodes.map(node => ({
            source: d.id, target: node.id, label: suggestions.relationship, isCandidate: true
        }));

        const finalNodes = [ ...existingNodes, ...newCandidateNodes ];
        const finalLinks = [ ...existingLinks, ...newCandidateLinks ];

        appState.setGraphState(
            { 
                graphData: { nodes: finalNodes, links: finalLinks }
            },
            { 
                isSelectionMode: true,
                activeNodeId: d.id,
                dismissedTermsMap: newDismissedTermsMap
            }
        );

    } catch (error) {
        console.error("Failed to fetch suggestions:", error);
    } finally {
        setQueryLoading(false);
    }
}


async function _handleQuerySubmit() {
    const query = elements.queryInput.value;
    if (!query) return;

    setQueryLoading(true, 'Generating...');
    try {
        const kg = await apiService.fetchInitialGraph(query);
        
        const nodes = kg.terms.map(term => ({ id: term }));
        const links = kg.relationships.map(rel => {
            const parts = rel.split('-');
            if (parts.length < 3) return null;
            const source = parts[0];
            const target = parts[parts.length - 1];
            const label = parts.slice(1, -1).join('-');
            return { source, target, label }; 
        }).filter(Boolean);

        nodes.forEach(node => {
            node.x = elements.svgContainer.clientWidth / 2 + (Math.random() - 0.5) * 10;
            node.y = elements.svgContainer.clientHeight / 2 + (Math.random() - 0.5) * 10;
        });
        
        appState.setGraphState({
            knowledgeGraph: kg,
            graphData: { nodes, links }
        });

    } catch (error) {
        console.error("Failed to generate initial graph:", error);
    } finally {
        setQueryLoading(false);
    }
}

function _handleEnterKey(e) {
    if (e.key !== 'Enter') return;
    if (elements.modal.style.display === 'flex') return;
    if (document.activeElement === elements.queryInput && !elements.queryButton.disabled) {
        _handleQuerySubmit();
    } 
    else if (elements.responseButton.style.display !== 'none' && !elements.responseButton.disabled) {
        elements.responseButton.click();
    }
}


async function _handleSelectionFinalized() {
    const { graphData, knowledgeGraph, activeNodeId, dismissedTermsMap } = appState.getState();
    
    const dismissedNodeIds = graphData.nodes
        .filter(n => n.isCandidate && !n.isQueued)
        .map(n => n.id);
    const selectedNodeIds = graphData.nodes
        .filter(n => n.isCandidate && n.isQueued)
        .map(n => n.id);

    const finalNodes = graphData.nodes
        .filter(n => !n.isCandidate || n.isQueued)
        .map(n => ({ 
            ...n,
            isCandidate: false,
            isQueued: false,
            fx: n.x,
            fy: n.y
        }));

    const finalNodeIds = new Set(finalNodes.map(n => n.id));

    const finalLinks = graphData.links
        .filter(l =>
            finalNodeIds.has(_getNodeId(l.source)) && 
            finalNodeIds.has(_getNodeId(l.target))
        )
        .map(l => ({ 
            ...l,
            isCandidate: false,
            source: _getNodeId(l.source),
            target: _getNodeId(l.target)
        }));
    
    const newKnowledgeGraph = {
        ...knowledgeGraph,
        terms: finalNodes.map(n => n.id),
        relationships: finalLinks.map(l => `${l.source}-${l.label}-${l.target}`)
    };
    
    let otherUpdates = {};

    if (selectedNodeIds.length === 0 && dismissedNodeIds.length > 0) {
        const oldDismissed = dismissedTermsMap[activeNodeId] || [];
        const newDismissedForNode = [...new Set([...oldDismissed, ...dismissedNodeIds])];
        const newDismissedTermsMap = { 
            ...dismissedTermsMap, 
            [activeNodeId]: newDismissedForNode 
        };
        otherUpdates.dismissedTermsMap = newDismissedTermsMap;
    }

    appState.setGraphState(
        {
            graphData: { nodes: finalNodes, links: finalLinks },
            knowledgeGraph: newKnowledgeGraph
        },
        otherUpdates 
    );
}

async function handleNodeClick(event, d) {
    const { isSelectionMode, activeNodeId } = appState.getState();

    if (isSelectionMode && d.id === activeNodeId) {
        await _fetchAndDisplaySuggestions(d);
        return;
    }

    if (d.isCandidate) {
        const currentGraphData = appState.getGraphData();
        const newNodes = currentGraphData.nodes.map(n => {
            if (n.id === d.id) {
                return { ...n, isQueued: !n.isQueued }; 
            }
            return { ...n }; 
        });
        const newLinks = currentGraphData.links.map(l => ({
            ...l,
            source: _getNodeId(l.source),
            target: _getNodeId(l.target)
        }));

        appState.setGraphState(
            { 
                graphData: { nodes: newNodes, links: newLinks }
            },
            { 
                isSelectionMode: true,
            }
        );
        return;
    }

    if (!isSelectionMode) {
        appState.setState({ isSelectionMode: true, activeNodeId: d.id });
        await _fetchAndDisplaySuggestions(d);
        return;
    }
}

function handleNodeRemoval(nodeId) {
    if (appState.isSelectionMode()) {
        console.log("Cannot remove nodes during selection mode.");
        return;
    }

    const { graphData, knowledgeGraph } = appState.getState();

    const finalNodes = graphData.nodes
        .filter(n => n.id !== nodeId)
        .map(n => ({ ...n })); 

    const finalNodeIds = new Set(finalNodes.map(n => n.id));

    const finalLinks = graphData.links
        .filter(l =>
            finalNodeIds.has(_getNodeId(l.source)) &&
            finalNodeIds.has(_getNodeId(l.target))
        )
        .map(l => ({ 
            ...l,
            source: _getNodeId(l.source),
            target: _getNodeId(l.target)
        })); 

    const newKnowledgeGraph = {
        ...knowledgeGraph,
        terms: finalNodes.map(n => n.id),
        relationships: finalLinks.map(l => `${l.source}-${l.label}-${l.target}`)
    };

    appState.setGraphState({
        graphData: { nodes: finalNodes, links: finalLinks },
        knowledgeGraph: newKnowledgeGraph
    });
}

function setQueryLoading(isLoading, text = '') {
    const btn = elements.queryButton;
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = `<span class="button-spinner"></span>${text}`;
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerText = originalQueryButtonText;
    }
}

function _cacheDOMElements() {
    elements.queryInput = document.getElementById('query-input');
    elements.queryButton = document.getElementById('query-button');
    originalQueryButtonText = elements.queryButton.innerText;
    elements.responseButton = document.getElementById('response-button');
    originalResponseButtonText = elements.responseButton.innerText;
    elements.modal = document.getElementById('response-modal');
    elements.modalText = document.getElementById('modal-text');
    elements.closeButton = document.querySelector('.close-button');
    elements.svgContainer = document.getElementById('graph-container');
    elements.loadingOverlay = document.querySelector('.loading-overlay');
    elements.loadingText = document.getElementById('loading-text');
    elements.undoButton = document.getElementById('undo-button');
    elements.redoButton = document.getElementById('redo-button');
}

function _bindEventListeners() {
    elements.queryButton.addEventListener('click', _handleQuerySubmit);
    document.addEventListener('keydown', _handleEnterKey);

    if (elements.undoButton) {
        elements.undoButton.addEventListener('click', appState.undo);
    }
    if (elements.redoButton) {
        elements.redoButton.addEventListener('click', appState.redo);
    }

    elements.closeButton.addEventListener('click', () => elements.modal.style.display = 'none');
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.style.display = 'none';
        }
    });
}

export const uiController = {
    init: () => {
        _cacheDOMElements();
        _bindEventListeners();
        
        appState.onChange((state, canUndo, canRedo) => {
            elements.responseButton.style.display = state.knowledgeGraph ? 'block' : 'none';
            if (elements.undoButton) elements.undoButton.disabled = !canUndo;
            if (elements.redoButton) elements.redoButton.disabled = !canRedo;
        });
    },

    setLoading: (isLoading, text = '') => {
        const btn = elements.responseButton;
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.innerHTML = `<span class="button-spinner"></span>${text}`;
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerText = originalResponseButtonText;
        }
    },

    handleNodeClick,
    handleNodeRemoval,
    handleBackgroundClick: () => {
        if (appState.isSelectionMode()) {
            _handleSelectionFinalized();
        }
    },
};