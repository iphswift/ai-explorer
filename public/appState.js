const state = {
    knowledgeGraph: null,
    graphData: { nodes: [], links: [] },
    isSelectionMode: false,
    activeNodeId: null,
    dismissedTermsMap: {}, 
    history: [],
    historyIndex: -1,
};

const listeners = [];

function canUndo() {
    return state.historyIndex > 0;
}

function canRedo() {
    return state.historyIndex < state.history.length - 1;
}

export const appState = {
    init: () => {
        const initialState = {
            knowledgeGraph: state.knowledgeGraph,
            graphData: state.graphData,
            isSelectionMode: state.isSelectionMode,
            activeNodeId: state.activeNodeId,
            dismissedTermsMap: state.dismissedTermsMap 
        };
        state.history = [initialState];
        state.historyIndex = 0;
    },

    onChange: (callback) => {
        listeners.push(callback);
    },

    setState: (updates) => {
        Object.assign(state, updates);
        listeners.forEach(callback => callback(state, canUndo(), canRedo()));
    },

    setGraphState: (graphUpdates, otherUpdates = {}) => {
        const newSelectionMode = otherUpdates.isSelectionMode !== undefined 
            ? otherUpdates.isSelectionMode 
            : false;
        
        const newActiveNodeId = newSelectionMode ? (otherUpdates.activeNodeId || state.activeNodeId) : null;
        
        const newDismissedTermsMap = otherUpdates.dismissedTermsMap !== undefined
            ? otherUpdates.dismissedTermsMap
            : state.dismissedTermsMap;

        const newGraphSnapshot = {
            knowledgeGraph: graphUpdates.knowledgeGraph || state.knowledgeGraph,
            graphData: graphUpdates.graphData || state.graphData,
            isSelectionMode: newSelectionMode,
            activeNodeId: newActiveNodeId,
            dismissedTermsMap: newDismissedTermsMap 
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        
        newHistory.push(newGraphSnapshot);
        const newIndex = newHistory.length - 1;

        appState.setState({
            ...newGraphSnapshot,
            ...otherUpdates, 
            history: newHistory,
            historyIndex: newIndex,
        });
    },

    undo: () => {
        if (!canUndo()) return;
        const newIndex = state.historyIndex - 1;
        const snapshotToRestore = state.history[newIndex];
        appState.setState({
            ...snapshotToRestore,
            historyIndex: newIndex,
        });
    },

    redo: () => {
        if (!canRedo()) return;
        const newIndex = state.historyIndex + 1;
        const snapshotToRestore = state.history[newIndex];
        appState.setState({
            ...snapshotToRestore,
            historyIndex: newIndex,
        });
    },

    getState: () => ({ ...state }),
    getGraph: () => state.knowledgeGraph,
    getGraphData: () => state.graphData,
    isSelectionMode: () => state.isSelectionMode,
};