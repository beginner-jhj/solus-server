import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {getScheudleRecommederPrompt} from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function getScheduleRecommendations({message,schedules,selectedDays}){
    try {
        const prompt = getScheudleRecommederPrompt(message,schedules,selectedDays);

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [prompt],
            config: { responseMimeType: "application/json" }
        });
        const jsonRes = response.text;
        const parsedRes = JSON.parse(jsonRes);

        const recommendations = parsedRes.recommendations || [];

        return {
            name: "recommend_schedule",
            summary: parsedRes.response,
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
