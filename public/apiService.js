const API_URL = 'http://localhost:3000';

export const apiService = {
    fetchInitialGraph: async (query) => {
        const response = await fetch(`${API_URL}/generate-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        return response.json();
    },

    fetchSuggestions: async (knowledgeGraph, selectedTerm) => {
        const response = await fetch(`${API_URL}/suggest-relationship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ knowledgeGraph, selectedTerm }),
        });
        return response.json();
    },

    fetchAlternativeSuggestions: async (knowledgeGraph, dismissedTerms) => {
        const response = await fetch(`${API_URL}/suggest-alternatives`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ knowledgeGraph, dismissedTerms }),
        });
        return response.json();
    },

    fetchFinalResponse: async (knowledgeGraph) => {
        const response = await fetch(`${API_URL}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ knowledgeGraph }),
        });
        return response.json();
    },
};