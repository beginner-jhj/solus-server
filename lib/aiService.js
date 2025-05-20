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
    
})

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
    case "schedule":
      const result = await scheduleAssistant.sendMessage(message);
      const parsedRes = parseResponseToJSON(result.response.text());
      return parsedRes;
    default:
      throw new Error("Invalid chatting type");
  }
};
