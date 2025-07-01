import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { getSurveyModelPrompt } from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function surveyModel(surveyHistory,nextStep){
    try {
        const prompt = getSurveyModelPrompt(surveyHistory,nextStep);
        const response = await ai.models.generateContent({
            model:"gemini-2.0-flash",
            contents:[prompt],
            config:{
                responseMimeType: "application/json",
            }
        })
        const result = JSON.parse(response.text);
        return result;
    } catch (error) {
        throw new Error(error);
    }
}