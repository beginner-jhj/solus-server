import Agent from "../ai/agent.js";
import { createPrompt } from "../ai/prompt.js";

const agent = new Agent({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
});

const model = agent.model;

export async function extractScheduleCreationInfo(userInput){
    try{
        const prompt = createPrompt({
            role: "AI that extracts schedule creation information from natural language.",
            goal: "Extract structured data to create a new event.",
            instructions: [
              "Return the date in year, month, and day.",
              "Extract startTime and (if possible) endTime in HH:MM 24-hour format.",
              "If exact time is not given, try to infer it based on context (e.g., lunch → 12:00) and set inferredTime = true.",
              "Extract a short, clear title (titleForEvent) based on the core event description.",
              "Use the full sentence or a slightly cleaned version as descriptionForEvent.",
              "If no time is found, set startTime and endTime to null and inferredTime to false.",
              "Always include the originalInput for traceability.",
              `Use today's date as a reference ${new Date().toISOString().split('T')[0]}`,
            ],
            outputFormat:`
            {
                "year": number,
                "month": number,
                "day": number,
                "startTime": string,
                "endTime": string,
                "inferredTime": boolean,
                "titleForEvent": string,
                "descriptionForEvent": string,
                "originalInput": string,
                "eventCategory": "Work" | "Personal" | "Study" | "Exercise"
            }
            `,
            examples: `
          Input: "Add a meeting with Dr. Kim next Thursday afternoon"
          Output:
          {
            "year": 2025,
            "month": 6,
            "day": 6,
            "startTime": "13:00",
            "endTime": null,
            "inferredTime": true,
            "titleForEvent": "Meeting with Dr. Kim",
            "descriptionForEvent": "Meeting with Dr. Kim next Thursday afternoon",
            "originalInput": "Add a meeting with Dr. Kim next Thursday afternoon",
            "eventCategory": "Work"
          }
          
          Input: "Schedule lunch with Sarah tomorrow"
          Output:
          {
            "year": 2025,
            "month": 5,
            "day": 29,
            "startTime": "12:00",
            "endTime": null,
            "inferredTime": true,
            "titleForEvent": "Lunch with Sarah",
            "descriptionForEvent": "Schedule lunch with Sarah tomorrow",
            "originalInput": "Schedule lunch with Sarah tomorrow",
            "eventCategory": "Personal"
          }
          `,
            userInput: userInput
          });
          const result = await model.generateContent(prompt);
          const response = result.response.text();
          const jsonResult = JSON.parse(response);
          return jsonResult;
    }catch(err){
        throw new Error(err);
    }

}