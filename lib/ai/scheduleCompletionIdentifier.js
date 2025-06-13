import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { getScheduleCompletionPrompt } from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function identifyScheduleToComplete(userQuery, schedules) {
  try {
    const prompt = getScheduleCompletionPrompt(userQuery, schedules);
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL,
      contents: [prompt],
      config: { responseMimeType: "application/json" }
    });
    const jsonRes = response.text;
    return JSON.parse(jsonRes);
  } catch (err) {
    console.error("Error in identifyScheduleToComplete:", err);
    return {
      failedToFindExactSchedule: true,
      id: null,
      response: "I couldn't determine which schedule to mark complete."
    };
  }
}
