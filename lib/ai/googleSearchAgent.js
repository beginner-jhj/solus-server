import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {createPrompt} from "./prompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const getGoogleSearchPrompt = (userInput) => createPrompt({
    role:"intelligent google search assistant.",
    context:"You are a google search assistant. You must search the web for the user's query.",
    goal:"Search the web for the user's query.",
    instructions:[
        "If user ask something vague, infer meaning from context or previous messages and reply helpfully.",
        "Refer to previous conversation context and user's profile info fluently, as if you have perfect memory (you do — kind of).",
    ],
    userInput: userInput,
    outputFormat:`
      {
        searchResult: string,
      }    
    `
})

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
