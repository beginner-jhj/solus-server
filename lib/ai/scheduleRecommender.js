import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {createPrompt} from "./prompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// No global prompt object needed here, it's constructed per call.

function formatUserInput({message,schedules,selectedDays}){
    return `
        User Input:
        ${message}

        Selected Days:
        ${JSON.stringify(selectedDays)}

        User Schedule:
        ${JSON.stringify(schedules)}
    `
}

export async function getScheduleRecommendations({message,schedules,selectedDays}){
    try {
        const modelPromptObject = createPrompt({
            role: "user", // This is the role for the Content object for Gemini
            context: "User is a busy person seeking to optimize their time for specific days, based on their existing commitments.",
            goal: "Generate personalized and actionable schedule recommendations based on the user's existing schedule and preferences for selected days.",
            instructions: [
                "Your primary function is to suggest relevant events/tasks for the user's selected days, considering their current schedule.",
                "You MUST provide specific suggestions with ALL of the following fields: title, description, suggestedDate, suggestedStartTime, suggestedEndTime, suggestedEventCategory.",
                "Base your recommendations on the 'User Input' (original request), 'Selected Days', and 'User Schedule' (current events) provided.",
                "Infer appropriate dates and times for suggestions primarily from the 'Selected Days'.",
                "If a selected day has no existing events in 'User Schedule', aim to suggest 3 diverse events (e.g., morning, afternoon, evening).",
                "If a selected day has few (less than 3) existing events, suggest additional events to fill gaps, considering morning, afternoon, and evening slots.",
                `For suggestions on today's date (${new Date().toISOString().split("T")[0]}), ensure the suggested start times are practical given the current time: ${new Date().getHours()}:${new Date().getMinutes()}. Do not suggest events in the past.`,
                "If you cannot make any relevant recommendations (e.g., the days are fully packed or the request is too vague for the selected days), the 'recommendations' array should be empty. In this case, your 'response' text should clearly explain why no recommendations could be made, offering a polite and helpful message.",
                "Do not ask clarifying questions. Make the best recommendations you can with the provided information or explain why you cannot."
            ],
            userInput: formatUserInput({ message, schedules, selectedDays }),
            outputFormat:`{
                "response": "string (Your textual explanation of the recommendations, or why none could be made. This should be a helpful, natural language message to the user.)",
                "recommendations": [
                  {
                    "title": "string",
                    "description": "string",
                    "suggestedDate": "YYYY-MM-DD (Must be one of the 'Selected Days')",
                    "suggestedStartTime": "HH:mm",
                    "suggestedEndTime": "HH:mm",
                    "suggestedEventCategory": "Exercise" | "Study" | "Work" | "Personal"
                  }
                ] // This array CAN be empty if no suitable recommendations are found.
              }`
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [modelPromptObject],
            config: { responseMimeType: "application/json" }
        });
        const jsonRes = response.text;
        const parsedRes = JSON.parse(jsonRes);

        const recommendations = parsedRes.recommendations || [];
        const responseText = parsedRes.response || (recommendations.length > 0 ? "Here are some schedule recommendations for you." : "I couldn't find any specific recommendations for the selected days based on your current schedule. Perhaps you could try different days or clarify your needs?");

        return {
            name: "recommend_schedule",
            summary: responseText,
            data: { recommendations }
        };
    } catch (err) {
        console.error("Error in getScheduleRecommendations:", err);
        return {
            name: "recommend_schedule",
            summary: "I encountered an issue while trying to generate schedule recommendations. Please try again later.",
            data: { recommendations: [] }
        };
    }
}
