import { aiService } from './aiService.js';
import * as prompts from './prompts.js';

function asyncHandler(fn) {
    return function(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export const graphController = {
    generateInitialGraph: asyncHandler(async (req, res) => {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        const termPrompt = prompts.keyTermPrompt(query);
        const terms = await aiService.getTerms(termPrompt);

        let relationships = [];
        if (terms.length > 1) {
            const relationshipPrompt = prompts.relationshipPrompt(query, terms);
            relationships = await aiService.getRelationships(relationshipPrompt);
        }

        const knowledgeGraph = {
            terms: terms,
            relationships: relationships,
            initialQuery: query,
        };

        res.json(knowledgeGraph);
    }),

    getSuggestions: asyncHandler(async (req, res) => {
        const { knowledgeGraph, selectedTerm } = req.body;
        if (!knowledgeGraph || !selectedTerm) {
            return res.status(400).json({ error: "knowledgeGraph and selectedTerm are required" });
        }

        const prompt = prompts.suggestionPrompt(knowledgeGraph, selectedTerm);
        const suggestion = await aiService.getSuggestions(prompt);

        res.json(suggestion);
    }),

    getAlternativeSuggestions: asyncHandler(async (req, res) => {
        const { knowledgeGraph, dismissedTerms } = req.body;
        if (!knowledgeGraph || !dismissedTerms) {
            return res.status(400).json({ error: "knowledgeGraph and dismissedTerms are required" });
        }

        const prompt = prompts.alternativeSuggestionPrompt(knowledgeGraph, dismissedTerms);
        
        const suggestion = await aiService.getSuggestions(prompt);

        res.json(suggestion);
    }),

    getFinalResponse: asyncHandler(async (req, res) => {
        const { knowledgeGraph } = req.body;
        if (!knowledgeGraph) {
            return res.status(400).json({ error: "knowledgeGraph is required" });
        }

        const prompt = prompts.finalResponsePrompt(knowledgeGraph);
        const result = await aiService.getFinalResponse(prompt);

        res.json({ response: result });
    }),
};