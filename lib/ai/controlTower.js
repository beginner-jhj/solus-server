import Agent from "./agent";
import {createPrompt} from "./prompt";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
const model = agent.model;

export async function controlTower(userInput){
    const prompt = createPrompt({
        role:"intelligent control tower for an AI assistant.",
        context:"You are a control tower for an AI assistant. You need to be responsible and make the best decision.",
        goal:"Analyze the user's input and determine the correct sub-model and tools to handle it.",
        instructions:[
            `Choose an adequateModel, one of these models:
                scheduleAssistant:"I can report and suggest events."
                mainAssistant:"I can answer general questions and based on provided informations like weather, news, web search results, etc."
                researchModel:"I can research and answer research questions."
            `,
            `Choose a tool, one of these tools:
                webSearchService:"For searching web."
                extractDateAndTime:"For extracting date and time from the user's input.",
                weatherService:"For getting weather information."
            `,
        ],
        outputFormat:`
        {
            "adequateModel": "scheduleAssistant" | "mainAssistant" | "researchModel",
            "extractedInput": "string (the core part of the user's query)",
            "tool": "webSearchService" | "extractDateAndTime" | "weatherService",
            "reasoning": "string (brief explanation for your routing decision)"
        }
        `,
        userInput:userInput,
    })
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonResult = JSON.parse(response);
    return jsonResult;
}
