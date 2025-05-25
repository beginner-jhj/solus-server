import Agent from "../ai/agent.js";
import {createPrompt} from "../ai/prompt.js";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

const model = agent.model;

export async function convertInputToWebSearchQuery(input){
    try {
        const prompt = createPrompt({
            role: "You are a smart assistant that converts user questions into optimized web search queries.",
            instructions: [
              "Extract the core keywords and phrases from the user's natural language input.",
              "Ignore filler words like 'please', 'can you', 'I want to know', etc.",
              "Use terms that would perform well in a real search engine query (e.g., Google).",
              "Keep it short, clear, and focused on the actual topic.",
              "If the user input is vague, use your best judgment to infer intent.",
              "Do not include punctuation or unnecessary modifiers.",
              "Return result as a valid JSON object using the format below."
            ],
            goal: "Generate a clean, effective web search query from the user's input.",
            outputFormat: `{
              "query": "string (the optimized web search query)"
            }`,
            examples: `
          Input: "Can you find some recent articles about AI in education?"
          Output:
          {
            "query": "AI in education recent articles"
          }
          
          Input: "What's the weather in Seoul today?"
          Output:
          {
            "query": "Seoul weather today"
          }
          
          Input: "Tell me about the latest Apple products"
          Output:
          {
            "query": "latest Apple products"
          }
            `,
            userInput: input
          });          
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const jsonResult = JSON.parse(response);
        return jsonResult;
    } catch (err) {
        throw new Error(err);
    }
}
