import "dotenv/config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from 'googleapis';

// For Google Generative AI (used in various assistants and controlTower)
// Ensure GOOGLE_API_KEY is set in your .env file.
// Obtain it from Google AI Studio: https://aistudio.google.com/app/apikey
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.warn("Google API Key (GOOGLE_API_KEY) is missing. Core AI functionalities will not work.");
}

// For Google Custom Search API (used in webSearchService and researchModelService)
// 1. Obtain an API Key from Google Cloud Console:
//    - Go to https://console.cloud.google.com/apis/credentials
//    - Create or select a project.
//    - Click "+ CREATE CREDENTIALS" and choose "API key".
//    - Ensure the "Custom Search API" is enabled for your project: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
//    - Set this key in your .env file as GOOGLE_SEARCH_API_KEY=YOUR_API_KEY
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;

// 2. Create a Programmable Search Engine and get its ID:
//    - Go to https://programmablesearchengine.google.com/controlpanel/all
//    - Create a new search engine.
//    - For broad searches (web search, research), configure it to search the entire web.
//    - Find the "Search engine ID" in the setup overview or settings.
//    - Set this ID in your .env file as GOOGLE_SEARCH_ENGINE_ID=YOUR_ENGINE_ID
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
  console.warn("Google Search API Key (GOOGLE_SEARCH_API_KEY) or Engine ID (GOOGLE_SEARCH_ENGINE_ID) is missing. Web search and research functionalities may not work as expected or will use mock data.");
}

// Initialize Google Custom Search client
const customsearch = google.customsearch('v1');

const ai = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
const scheduleAssistant = model.startChat({
  history: [
    {
      role: "user",
      parts: [
        {
          text: `
  You are a helpful scheduling assistant that performs three key functions depending on the user's input:

1. 📊 Report: Summarize the user's schedule.
2. 💡 Recommend: Suggest useful activities based on their schedule patterns.
3. 💬 Chat: Answer general questions about time management or schedules.

You will always return your answer as a **JSON object** in this format:

{
  "intent": "report" | "recommend" | "chat",
  "response": "string (your actual answer to the user)",
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "suggestedDate": "YYYY-MM-DD",
      "suggestedStartTime": "HH:mm",
      "suggestedEndTime": "HH:mm",
      "suggestedEventCategory": "Exercise" | "Study" | "Work" | "Personal"
    }
  ] // Only if intent is "recommend" 
}

Instructions:
1. First, classify the intent as one of ["report", "recommend", "chat"] based on the **user input**.
2. Then generate an appropriate response for that intent.
3. If intent is "recommend", you must include specific suggestions with:
   - title
   - description
   - suggestedDate
   - suggestedStartTime
   - suggestedEndTime
   - suggestedEventCategory
   The date and time can be inferred from selected days.
   If there is a day with no events, suggest 3 events for that day(morning, afternoon, and evening).
   If there is a day with few(less than 3) events, suggest more events for that day(morning, afternoon, and evening).
4. Your entire output must be a valid JSON object. Do not explain anything outside the JSON.
  `,
        },
      ],
    },
  ],
});

const mainAssistant = model.startChat({
  history: [
    {
      role: "user",
      parts: [
        {
          text: `
You are a helpful and friendly general assistant. Engage in conversation and answer general questions.
Return your answer as a JSON object in this format:
{
  "response": "your chat response"
}
`,
        },
      ],
    },
  ],
});

const parseResponseToJSON = (raw) => {
  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const jsonResult = JSON.parse(cleaned);
  return jsonResult;
};

export const makeScheduleChatPrompt = (input, schedules, selectedDays, preferedLanguage) => {
  const prompt = `
    You are a helpful scheduling assistant...

    🔹 User Input:
        ${input}

    🔹 User Language:
       Your default language is ${preferedLanguage}.
       However, if the user input is clearly written in another language, you must respond in that detected language instead.
       Always respond in the same language that the user used.
       Use natural, human-like expressions for that language, and never mix multiple languages in the same response.

    🔹 Selected Days:
        ${JSON.stringify(selectedDays)}

    🔹 User Schedule:
        ${JSON.stringify(schedules)}
  `;
  return prompt;
};

export const extractDateAndTime = async (input) => {
  const today = new Date();
  const isoToday = today.toISOString().split("T")[0];
  const result =
    await model.generateContent(`You are an AI that extracts precise date and time information from natural language.

    Given a sentence describing a schedule or event, extract:
    - date: exact date (YYYY-MM-DD) if a specific day is mentioned
- time: in HH:MM 24-hour format if clearly stated
- inferredTime: true or false
- inferredTimeValue: your best guess if inferredTime is true (e.g., "12:00" for lunch)
- period:
  - startDate: if a time range like "this week", "next month", or "weekend" is mentioned, give the start date
  - endDate: the corresponding end date
  - if no period is found, both startDate and endDate should be null

Use today’s date as reference: ${isoToday}

Examples:

Input: "Lunch meeting on May 5"
Output:
{
  "date": "2025-05-05",
  "time": null,
  "inferredTime": true,
  "inferredTimeValue": "12:00",
  "period": {
    "startDate": null,
    "endDate": null
  }
}

Input: "Company dinner next Thursday evening"
Output:
{
  "date": "2025-05-08",
  "time": null,
  "inferredTime": true,
  "inferredTimeValue": "19:00",
  "period": {
    "startDate": null,
    "endDate": null
  }
}

Input: "Give me a report this week"
Output:
{
  "date": null,
  "time": null,
  "inferredTime": false,
  "inferredTimeValue": null,
  "period": {
    "startDate": "2025-04-28",
    "endDate": "2025-05-04"
  }
}
    
    Now extract from this:
    ${input}`);
  const response = result.response;
  const jsonResult = parseResponseToJSON(response.text());
  return jsonResult;
};

export const sendMessageToChat = async (type, message) => {
  switch (type) {
    case "schedule": {
      const result = await scheduleAssistant.sendMessage(message);
      const parsedRes = parseResponseToJSON(result.response.text());
      return parsedRes;
    }
    case "general": {
      const result = await mainAssistant.sendMessage(message);
      const parsedRes = parseResponseToJSON(result.response.text());
      return parsedRes;
    }
    default:
      throw new Error(`Invalid chatting type: ${type}`);
  }
};

export const controlTower = async (userInput) => {
  const prompt = `
You are an intelligent control tower for an AI assistant. Your task is to analyze the user's input and determine the correct sub-model or assistant to handle it.

Possible intents are: "schedule_query", "general_chat", "web_search", "research_task", "data_extraction_time".
Possible adequateModels are: "scheduleAssistant", "mainAssistant", "webSearchService", "researchModelService", "extractDateAndTime".

Based on the user's input, you must provide:
- "intent": One of the possible intents.
- "adequateModel": The most appropriate model to handle the intent.
- "extracted_input": The core part of the user's query that the target model needs.
- "reasoning": A brief explanation for your routing decision.

The output MUST be a valid JSON object.

User Input: "${userInput}"

JSON Output:
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonResult = parseResponseToJSON(response.text());
    return jsonResult;
  } catch (error) {
    console.error("Error in controlTower:", error);
    // It might be good to return a default error object or throw the error
    // depending on how the calling code should handle this.
    // For now, let's re-throw.
    throw new Error(`Failed to get or parse response from AI control tower: ${error.message}`);
  }
};

export const webSearchService = async (extracted_input) => {
  console.log("webSearchService received:", extracted_input);

  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.warn("Web search service is not configured: Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID.");
    return {
      error: "Web search service is not configured. Missing API key or Search Engine ID.",
      search_query: extracted_input,
      results: [],
      message: "Web search configuration error."
    };
  }

  try {
    const response = await customsearch.cse.list({
      auth: GOOGLE_SEARCH_API_KEY,
      cx: GOOGLE_SEARCH_ENGINE_ID,
      q: extracted_input,
      num: 5, // Get up to 5 results
    });

    const processed_items = response.data.items && response.data.items.length > 0
      ? response.data.items.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }))
      : [];

    return {
      search_query: extracted_input,
      results: processed_items,
      message: processed_items.length > 0 ? "Web search completed." : "No results found for your query."
    };

  } catch (error) {
    console.error("Error during web search:", error);
    return {
      error: "Error during web search.",
      details: error.message,
      search_query: extracted_input,
      results: [],
      message: "Web search failed."
    };
  }
};

export const handleAssistantRequest = async (userInput) => {
  let routingDecision;
  let subModelResponse = null;

  try {
    routingDecision = await controlTower(userInput);

    switch (routingDecision.adequateModel) {
      case "scheduleAssistant":
        subModelResponse = await sendMessageToChat("schedule", routingDecision.extracted_input);
        break;
      case "mainAssistant":
        subModelResponse = await sendMessageToChat("general", routingDecision.extracted_input);
        break;
      case "extractDateAndTime":
        subModelResponse = await extractDateAndTime(routingDecision.extracted_input);
        break;
      case "webSearchService":
        subModelResponse = await webSearchService(routingDecision.extracted_input);
        break;
      case "researchModelService":
        subModelResponse = await researchModelService(routingDecision.extracted_input);
        break;
      default:
        console.error("Unknown adequateModel:", routingDecision.adequateModel);
        // You might want to throw an error or return a specific error structure
        subModelResponse = { error: `Unknown adequateModel: ${routingDecision.adequateModel}` };
    }
  } catch (error) {
    console.error("Error in handleAssistantRequest:", error);
    // Return a structured error that includes the phase where it occurred
    return {
      error: "Failed to process request",
      details: error.message,
      routingDecision: routingDecision, // Include routingDecision if available
      subModelResponse: subModelResponse // Include subModelResponse if available
    };
  }

  return {
    ...routingDecision,
    subModelResponse,
  };
};

export const researchModelService = async (extracted_input) => {
  console.log("researchModelService received:", extracted_input);

  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.warn("Research service is not configured: Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID.");
    return {
      error: "Research service is not configured. Missing API key or Search Engine ID.",
      research_topic: extracted_input,
      results: [],
      message: "Research service configuration error."
    };
  }

  try {
    const response = await customsearch.cse.list({
      auth: GOOGLE_SEARCH_API_KEY,
      cx: GOOGLE_SEARCH_ENGINE_ID,
      q: extracted_input,
      num: 10, // Request up to 10 results for research
    });

    const processed_items = response.data.items && response.data.items.length > 0
      ? response.data.items.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }))
      : [];

    return {
      research_topic: extracted_input,
      results: processed_items,
      message: processed_items.length > 0 ? "Research search completed." : "No results found for your research query."
    };

  } catch (error) {
    console.error("Error during research search:", error);
    return {
      error: "Error during research search.",
      details: error.message,
      research_topic: extracted_input,
      results: [],
      message: "Research search failed."
    };
  }
};
