import { GoogleGenAI } from "@google/genai";

let genAI;
let model;
let answerModel;

function _initializeAI() {
    if (!genAI) {
        console.log("Initializing AI. Key available:", !!process.env.GOOGLE_API_KEY);
        genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
        model = genAI.chats.create({ model: "gemini-2.5-flash-lite" });
        answerModel = genAI.chats.create({ model: "gemini-2.5-flash" });
    }
}

async function _callAI(prompt, modelToUse) {
    const result = await modelToUse.sendMessage({ message: prompt });
    return result.candidates[0].content.parts[0].text.trim();
}

function _cleanJsonString(text) {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

export const aiService = {
    getTerms: async (prompt) => {
        _initializeAI(); 
        const rawText = await _callAI(prompt, model);
        const jsonString = _cleanJsonString(rawText);
        const data = JSON.parse(jsonString);
        return data.terms || [];
    },

    getRelationships: async (prompt) => {
        _initializeAI(); 
        const rawText = await _callAI(prompt, model);
        const jsonString = _cleanJsonString(rawText);
        const data = JSON.parse(jsonString);
        return data.relationships || [];
    },

    getSuggestions: async (prompt) => {
        _initializeAI(); 
        const rawText = await _callAI(prompt, model);
        const jsonString = _cleanJsonString(rawText);
        return JSON.parse(jsonString);
    },

    getFinalResponse: async (prompt) => {
        _initializeAI(); 
        const text = await _callAI(prompt, answerModel);
        return text.trim();
    },
};