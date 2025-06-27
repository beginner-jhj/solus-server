import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {getSuggestionModelPrompt } from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function getSuggestionModelResponse(hasSchedule,userNearestSchedule,userProfile,clientTime,clientDate){

    let userNearestScheduleToSend = userNearestSchedule;
    if(!hasSchedule){
        userNearestScheduleToSend = "User doesn't have any schedule now.";
    }
    
    const prompt = getSuggestionModelPrompt(userNearestScheduleToSend,userProfile,clientTime,clientDate);

    try{
    
    const response = await ai.models.generateContent({
        model:process.env.GEMINI_MODEL,
        contents:[prompt],
        config:{
            temperature:0.8,
            responseMimeType:"application/json"
        }
    })
    
    return JSON.parse(response.text);
    }catch(error){
        console.error(error);
        throw error;
    }
}