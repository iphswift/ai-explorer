export const keyTermPrompt = (query) => `You are an expert key term extractor. Your task is to analyze the user's query and extract the most important, distinct nouns or concepts.

**User Query:** "${query}"

**Instructions:**
1.  Identify the most important, distinct nouns or concepts. These are your "terms".
2.  Format the output as a JSON object with a single key: "terms".
3.  "terms" should be an array of strings.
4.  If no key terms are found, return an empty array.

**Example 1:**
User Query: "What is the capital of France?"
\`\`\`json
{
  "terms": ["France", "capital"]
}
\`\`\`

**Example 2:**
User Query: "What is the time?"
\`\`\`json
{
    "terms": ["time"]
}
\`\`\`

**Your Output:`;


export const relationshipPrompt = (query, terms) => `You are an expert relationship extractor for a knowledge graph. Given a user's query and a pre-defined list of key terms, your task is to identify the relationships that connect these terms.

**User Query:** "${query}"
**Key Terms:** [${terms.join(', ')}]

**Instructions:**
1.  Analyze the query to understand how the provided key terms are connected.
2.  Format the output as a JSON object with a single key: "relationships".
3.  "relationships" should be an array of strings in the format "term1-verb-phrase-term2".
4.  **Crucially, you must only use terms from the provided Key Terms list.**
5.  If no relationships are found between the terms, return an empty array.

**Example:**
User Query: "What is the capital of France?"
Key Terms: [France, capital]
\`\`\`json
{
  "relationships": ["has"]
}
\`\`\`

**Your Output:`;


export const suggestionPrompt = (knowledgeGraph, term) => `You are a strategic analyst. Your goal is to figure out the single most important piece of missing information needed to answer a user's query.

**The User's Goal (Original Query):** "${knowledgeGraph.initialQuery}"

**Facts We Know (Current Knowledge Graph):**
- Terms: ${knowledgeGraph.terms.join(', ')}
- Relationships: ${knowledgeGraph.relationships.join(', ')}

**Your Task:**
1.  Analyze the user's goal.
2.  Look at the facts. Identify the biggest ambiguity or missing context that prevents you from giving a specific, final answer. For example, to answer "what is the time?", you are missing a location. To answer "what is the capital?", you are missing a country.
3.  Formulate this missing piece of context as a simple, hyphenated relationship for the term "${term}". This relationship is the question you need to ask.
4.  Provide 2-3 concise but fundamentally different options (terms) that would resolve this ambiguity. Each option must represent a distinct path the final answer could take.

**Format your output as a single JSON object with two keys: "relationship" and "terms".** "relationship" should be a string (e.g., "needs-location"), and "terms" should be an array of strings (e.g., ["Chicago", "London", "Tokyo"]).

**Your Output:`;


export const finalResponsePrompt = (knowledgeGraph) => `You are an expert question-answering AI. Your goal is to provide a helpful, comprehensive, and natural-sounding answer to a user's question.

**The user's original, ambiguous question was:**
"${knowledgeGraph.initialQuery}"

**Through a clarification process, the user has provided the specific context you need. This context is defined by the following knowledge graph:**
- Terms: ${knowledgeGraph.terms.join(', ')}
- Relationships: ${knowledgeGraph.relationships.join(', ')}

**YOUR TASK:**
1.  **Understand the Context.** Use the knowledge graph to understand the specific context that resolves the original ambiguity. The graph is your starting point, not the entire answer.
2.  **Provide a Comprehensive Answer.** Now that some amount of ambiguity is resolved, provide a thorough and helpful answer to the user's **original question**. Your answer should be generative and leverage your broad knowledge base. For example, if the user asked "what computer should I get?" and clarified "Windows", don't just say "Get a Windows computer." Instead, explain the tradeoffs, options, and recommendations within the Windows ecosystem.
3.  **Be a helpful expert, not a robot.** Your tone should be conversational and informative.
4.  **Do not mention the knowledge graph.** The user doesn't need to know about the internal process. Just give them the final, clear answer.

**Example:**
- Original Query: "What is the time?"
- Final Graph: terms: ["time", "Chicago"], relationships: ["time-needs-location-Chicago"]
- **CORRECT RESPONSE:** "The current time in Chicago, Illinois is Friday, October 17, 2025 at 1:20 PM."
- **INCORRECT RESPONSE:** "The location for the time is Chicago."

**Begin your final answer now.`;


export const alternativeSuggestionPrompt = (knowledgeGraph, dismissedTerms) => `You are a strategic analyst. Your goal is to help a user find the information they need by offering new lines of inquiry.

**The User's Goal (Original Query):** "${knowledgeGraph.initialQuery}"

**Facts We Know (Current Knowledge Graph):**
- Terms: ${knowledgeGraph.terms.join(', ')}
- Relationships: ${knowledgeGraph.relationships.join(', ')}

**Terms the User Just Dismissed:**
- [${dismissedTerms.join(', ')}]

**Your Task:**
1.  Analyze the user's goal and the facts we know.
2.  Analyze the terms the user *rejected*. This provides a strong signal about what they *don't* want.
3.  Suggest a *new* relationship to explore and 2-3 *new, fundamentally different* terms.
4.  **Do not include any of the dismissed terms in your new suggestions.**

**Format your output as a single JSON object with two keys: "relationship" and "terms".** "relationship" should be a string (e.g., "needs-different-context"), and "terms" should be an array of strings (e.g., ["Option A", "Option B"]).

**Your Output:`;