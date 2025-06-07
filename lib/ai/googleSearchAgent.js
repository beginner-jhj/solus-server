import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {getGoogleSearchPrompt} from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function googleSearchAgent(userRequest){
    try {
        const prompt = getGoogleSearchPrompt(userRequest);
        const response = await ai.models.generateContent({
            model:"gemini-2.0-flash",
            contents:[prompt],
            config:{
                tools:[
                    {googleSearch : {}}
                ]
            }
        })
        const result = response.text;
        return result;
    } catch (error) {
        throw new Error(error);
    }
}
