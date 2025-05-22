import "dotenv/config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
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
  return Promise.resolve({
    search_query: extracted_input,
    results: [
      { title: "Mock Search Result 1", url: "http://example.com/result1", snippet: "This is a mock search result." },
      { title: "Mock Search Result 2", url: "http://example.com/result2", snippet: "Another mock search result." }
    ],
    message: "Web search completed (mock)."
  });
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
  return Promise.resolve({
    research_topic: extracted_input,
    summary: "This is a mock research summary for the topic: " + extracted_input,
    sources: [ "http://example.com/source1", "http://example.com/source2" ],
    message: "Research task completed (mock)."
  });
};
