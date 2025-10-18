import { appState } from './appState.js';
import { graphView } from './graphView.js';
import { uiController } from './uiController.js';
import { apiService } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    uiController.init();

    appState.init();

    graphView.init('svg', { 
        onNodeClick: uiController.handleNodeClick,
        onNodeRightClick: uiController.handleNodeRemoval,
        onBackgroundClick: uiController.handleBackgroundClick 
    });

    appState.onChange((state, canUndo, canRedo) => {
        graphView.render(state.graphData, state.isSelectionMode);
    });

    const markdownWorker = new Worker('./public/parser.worker.js');

    const responseButton = document.getElementById('response-button');
    const modal = document.getElementById('response-modal');
    const modalText = document.getElementById('modal-text');
    const closeButton = document.querySelector('.close-button');

    function showModal() {
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
    }

    closeButton.addEventListener('click', hideModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });

    markdownWorker.onmessage = (event) => {
        const { success, html, error } = event.data;

        if (success) {
            modalText.innerHTML = html;
        } else {
            console.error('Worker failed to parse markdown:', error);
            modalText.innerText = 'Sorry, an error occurred while rendering the response. Please try again.';
        }

        modal.classList.remove('invisible');
        uiController.setLoading(false); 
    };

    responseButton.addEventListener('click', async () => {
        uiController.setLoading(true, 'Generating...');
        modal.classList.add('invisible');
        showModal();
        try {
            const currentKnowledgeGraph = appState.getState().knowledgeGraph;

            if (!currentKnowledgeGraph || currentKnowledgeGraph.terms.length === 0) {
                modalText.innerText = 'The knowledge graph is empty. Please generate a graph first.';
                modal.classList.remove('invisible'); 
                uiController.setLoading(false);
                return;
            }

            const response = await apiService.fetchFinalResponse(currentKnowledgeGraph);
            markdownWorker.postMessage(response.response);

        } catch (error) {
            console.error('Failed to get final response:', error);
            modalText.innerText = 'Sorry, an error occurred while fetching the answer.';
            modal.classList.remove('invisible'); 
            uiController.setLoading(false);
        }
    });
});