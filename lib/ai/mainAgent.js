import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createPrompt } from "./prompt.js";
import {getMainAgentPrompt} from "../tools/getPrompt.js";

// Maximum retry attempts for transient errors
const MAX_RETRIES = 3;
// Timeout for API calls in milliseconds
const API_TIMEOUT = 15000;

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// Error types for more specific error handling
const ErrorTypes = {
  API_ERROR: 'api_error',
  TIMEOUT_ERROR: 'timeout_error',
  PARSING_ERROR: 'parsing_error',
  UNKNOWN_ERROR: 'unknown_error'
};
/**
 * Enhanced main agent function with improved error handling, context management, and personalization
 */
export async function mainAgent(userRequest,chatHistory,userProfile,functionResponses){
    let retries = 0;
    let lastError = null;
    
    const prompt = getMainAgentPrompt(userRequest,chatHistory,userProfile,functionResponses);
    
    while (retries < MAX_RETRIES) {
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), API_TIMEOUT);
            });
            
            // Create the API call promise
            const apiPromise = (async () => {
                const response = await ai.models.generateContent({
                    model: process.env.GEMINI_MODEL,
                    contents: [prompt],
                    config: {
                        responseMimeType: "application/json",
                    },
                });
                return response;
            })();
            
            // Race the API call against the timeout
            const response = await Promise.race([apiPromise, timeoutPromise]);
            
            // Parse the JSON response with error handling
            try {
                const jsonRes = JSON.parse(response.text);
                
                // Add conversation metadata for tracking
                jsonRes.conversation_metadata = {
                    timestamp: new Date().toISOString(),
                    input_length: userRequest.length,
                    response_length: response.text.length,
                    model_used: process.env.GEMINI_MODEL,
                    retries_needed: retries
                };
                
                return jsonRes;
            } catch (parseError) {
                console.error("Error parsing JSON response:", parseError);
                throw { type: ErrorTypes.PARSING_ERROR, error: parseError, response: response.text };
            }
        } catch (error) {
            lastError = error;
            retries++;
            
            // Log the error with details for debugging
            console.error(`MainAgent error (attempt ${retries}/${MAX_RETRIES}):`, error);
            
            // If it's not the last retry, wait before trying again
            if (retries < MAX_RETRIES) {
                const delay = Math.pow(2, retries) * 1000; // Exponential backoff
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // All retries failed, determine the error type and return appropriate response
    let errorType = ErrorTypes.UNKNOWN_ERROR;
    let errorMessage = "I'm sorry, but I encountered an unexpected issue while trying to process your request.";
    
    if (lastError && lastError.type) {
        errorType = lastError.type;
        
        // Customize error message based on error type
        switch (errorType) {
            case ErrorTypes.API_ERROR:
                errorMessage = "I'm having trouble connecting to my knowledge services right now. Please try again in a moment.";
                break;
            case ErrorTypes.TIMEOUT_ERROR:
                errorMessage = "It's taking longer than expected to process your request. Could you try again or perhaps simplify your question?";
                break;
            case ErrorTypes.PARSING_ERROR:
                errorMessage = "I had trouble understanding the information I received. Let's try a different approach.";
                break;
            default:
                // Use default error message
                break;
        }
    }
    
    return {
        response: errorMessage,
        summary: "Error processing request",
        user_intent_summary: "N/A - Error occurred",
        new_user_preference: {},
        next_step: {
            suggestion: "Try rephrasing your request or wait a moment before trying again.",
            type: "suggestion"
        },
        metadata: {
            topic: "Error",
            tone: "apologetic",
            error_type: errorType
        },
        conversation_repair: {
            detected_confusion: true,
            clarification_needed: true,
            misunderstanding_detected: false,
            suggested_clarification: "Could you please try asking your question in a different way?"
        },
        determinedFormatType: "error",
        conversation_metadata: {
            timestamp: new Date().toISOString(),
            error: true,
            error_type: errorType
        }
    };
}
