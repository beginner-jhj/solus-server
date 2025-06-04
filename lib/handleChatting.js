import {controlAgent} from "./ai/controlAgent.js";
import {googleSearchAgent} from "./ai/googleSearchAgent.js";
import { mainAgent, extractConversationContext } from "./ai/mainAgent.js";
import { getScheduleRecommendations } from "./ai/scheduleRecommender.js";

import { weatherService } from "./tools/weatherService.js";
import {addSchedule, getEvents} from "../DB/schedule.js";

/**
 * Enhanced handleChatting function with improved conversation context management and error handling
 * @param {string} userRequest - The user's input message
 * @param {Object} userMetaData - Metadata about the user and conversation
 * @returns {Object} - The agent's response
 */
export async function handleChatting(userRequest, userMetaData){
    try {
        // Start tracking execution time for performance monitoring
        const startTime = Date.now();
        
        // Extract conversation context from chat history if available
        const conversationContext = userMetaData.chatHistory && userMetaData.chatHistory.length > 0 ?
            extractConversationContext(userMetaData.chatHistory, userMetaData.userProfileInfo) : null;
            
        let responseToMainAsistant = {
            originalUserRequest: userRequest,
            functionResponse: [],
            googleSearchResponse: null,
            userProfileInfo: userMetaData.userProfileInfo,
            chatHistory: userMetaData.chatHistory || [], // Include chat history if provided
            conversationContext: conversationContext // Add extracted conversation context
        };
        
        // Log the request for monitoring
        console.log(`Processing request from user ${userMetaData.id}: ${userRequest.substring(0, 100)}${userRequest.length > 100 ? '...' : ''}`);
        
        // Get function calls from control agent
        const response = await controlAgent(userRequest, conversationContext);
        
        // Execute functions if any were returned
        if(response.functionUsed && response.functionUsed.length > 0){
            try {
                const functionResponse = await executeFunction(response.functionUsed, userMetaData, response.originalUserInput);
                responseToMainAsistant.functionResponse.push(functionResponse);
            } catch (functionError) {
                console.error("Error executing function:", functionError);
                // Continue processing even if function execution fails
                responseToMainAsistant.functionResponse.push({
                    error: true,
                    message: `Error executing function: ${functionError.message}`
                });
            }
        }

        // Execute Google search if a query was returned
        if(response.googleSearchQuery){
            try {
                const googleSearchResponse = await googleSearchAgent(response.googleSearchQuery);
                responseToMainAsistant.googleSearchResponse = googleSearchResponse;
            } catch (searchError) {
                console.error("Error executing Google search:", searchError);
                responseToMainAsistant.googleSearchResponse = 
                    `Error executing search for "${response.googleSearchQuery}": ${searchError.message}`;
            }
        }

        // Format the response for the main agent
        const formattedResponseToMainAsistant = formatResponseToMainAssistant(responseToMainAsistant);
        
        // Call the main agent with the enhanced parameters
        const mainAgentResponse = await mainAgent({
            userInput: formattedResponseToMainAsistant,
            conversationContext: conversationContext,
            userProfile: userMetaData.userProfileInfo
        });
        
        // Add performance metrics
        const executionTime = Date.now() - startTime;
        mainAgentResponse.performance_metrics = {
            execution_time_ms: executionTime,
            timestamp: new Date().toISOString(),
            functions_called: response.functionUsed ? response.functionUsed.length : 0,
            google_search_performed: !!response.googleSearchQuery
        };
        
        console.log(`Request processed in ${executionTime}ms`);
        return mainAgentResponse;
    } catch (error) {
        console.error("Error in handleChatting:", error);
        
        // Determine error type for better user feedback
        let errorMessage = "I'm sorry, something went wrong while processing your request. Please try again.";
        let errorType = "general_error";
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            errorMessage = "I'm having trouble connecting to my services right now. Please try again in a moment.";
            errorType = "connection_error";
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = "Your request is taking longer than expected to process. Could you try again or perhaps simplify your question?";
            errorType = "timeout_error";
        } else if (error.message && error.message.includes('rate limit')) {
            errorMessage = "I'm receiving too many requests right now. Please try again in a moment.";
            errorType = "rate_limit_error";
        }
        
        return {
          response: errorMessage,
          summary: "Error processing request",
          user_intent_summary: "N/A - Error occurred before main agent processing",
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
          performance_metrics: {
            error: true,
            error_type: errorType,
            timestamp: new Date().toISOString()
          }
        };
    }
}

/**
 * Formats the response data for the main assistant in a structured way
 * @param {Object} responseToMainAsistant - The data to format
 * @returns {string} - The formatted response
 */
function formatResponseToMainAssistant(responseToMainAsistant){
    // Format chat history if available
    const chatHistoryFormatted = responseToMainAsistant.chatHistory && responseToMainAsistant.chatHistory.length > 0 
        ? `Chat History: ${JSON.stringify(responseToMainAsistant.chatHistory)}` 
        : 'Chat History: None';
    
    // Format conversation context if available
    const contextFormatted = responseToMainAsistant.conversationContext 
        ? `Conversation Context: ${JSON.stringify(responseToMainAsistant.conversationContext)}` 
        : 'Conversation Context: None';
    
    return `
        Original User Request: ${responseToMainAsistant.originalUserRequest}
        Function Response: ${JSON.stringify(responseToMainAsistant.functionResponse)}
        Google Search Response: ${responseToMainAsistant.googleSearchResponse}
        User Profile Info: ${JSON.stringify(responseToMainAsistant.userProfileInfo)}
        ${chatHistoryFormatted}
        ${contextFormatted}
    `
}

async function executeFunction(functionCalls, userMetaData, originalUserRequest){
    for(const functionCall of functionCalls){
        console.log("functionCall:",functionCall);
        switch(functionCall.name){
            case "get_weather_forecast":
                return await executeWeatherForecast({...functionCall.args,latitude:userMetaData.latitude,longitude:userMetaData.longitude});
            case "add_schedule_event":
                return await executeAddScheduleEvent({...functionCall.args,userId:userMetaData.id});
            case "get_schedule_events":
                // The entire functionCall.args should now be { event_queries: [...] }
                return await executeGetScheduleEvents({userId: userMetaData.id, ...functionCall.args});
            case "use_google_search":
                return await executeGoogleSearch(functionCall.args);
            case "recommend_schedule":
                return await executeRecommendSchedule(functionCall.args, userMetaData, originalUserRequest);
            default:
                throw new Error(`Invalid function name: ${functionCall.name}`);
        }
    }
    
}

async function executeWeatherForecast({latitude,longitude,cityName=null,days=1}){
    try{
        if((!latitude && !longitude) && !cityName){
            throw new Error("Please provide latitude, longitude or cityName");
        }

        const weatherData = await weatherService(latitude,longitude,cityName,days);
        const response = {
            name:"get_weather_forecast",
            rawData:weatherData
        }

        return response;
    }catch(err){
        throw new Error(`Error occurred while executing get_weather_forecast: ${err}`);
    }
}

async function executeAddScheduleEvent({userId,title,date,start_time,end_time,description,event_category}){
    try{
        const [year,month,day] = date.split("-");
        const startTime = start_time===undefined ? "":start_time;
        const endTime = end_time===undefined ? "":end_time;
        const result = await addSchedule({
            userId,
            title,
            description,
            startTime,
            endTime,
            eventCategory:event_category,
            year,
            month,
            day
        })
        const response = {
            name:"add_schedule_event",
            rawData:result
        }
        return response;
    }catch(err){
        throw new Error(`Error occurred while executing add_schedule_event: ${err.message}`);
    }
}

async function executeGetScheduleEvents({ userId, event_queries }) { // Updated signature
    try {
        if (!event_queries || !Array.isArray(event_queries) || event_queries.length === 0) {
            throw new Error("Invalid or empty event_queries array.");
        }

        let allEvents = [];
        for (const queryItem of event_queries) {
            const [year, month, day] = queryItem.date.split('-');

            // queryItem.time_condition, queryItem.time_reference, queryItem.time_reference_end
            // can be undefined if not provided by AI, and getEvents handles undefined as null.
            const eventsForQuery = await getEvents(
                userId,
                year,
                month,
                day,
                queryItem.time_condition, 
                queryItem.time_reference,
                queryItem.time_reference_end 
            );

            if (eventsForQuery && eventsForQuery.length > 0) {
                allEvents.push(...eventsForQuery);
            }
        }

        return {
            name: "get_schedule_events",
            rawData: allEvents
        };
    } catch (err) {
        // Ensure the error message is not doubly wrapped if it's already specific.
        if (err.message.startsWith("Error occurred while executing get_schedule_events:")) {
            throw err;
        }
        throw new Error(`Error occurred while executing get_schedule_events: ${err.message}`);
    }
}

async function executeRecommendSchedule(functionCallArgs, userMetaData, originalUserRequest) {
    let fetchedCurrentEvents = [];
    const selectedDays = functionCallArgs.selectedDays; // Adapted to functionCallArgs

    if (!userMetaData.id) {
        console.error("Error: userMetaData.id is not available for recommend_schedule.");
        // Potentially return an error or an empty recommendation.
        // For now, proceeding will likely result in scheduleAssistantResult being a default/error message.
    } else if (selectedDays && Array.isArray(selectedDays) && selectedDays.length > 0) {
        for (const dateString of selectedDays) {
            try {
                const [year, month, day] = dateString.split('-');
                if (!year || !month || !day) {
                    console.error(`Invalid date string format: ${dateString} in selectedDays.`);
                    continue; // Skip to next date
                }
                const eventsForDay = await getEvents(userMetaData.id, year, month, day, null, null, null);
                if (eventsForDay && eventsForDay.length > 0) {
                    fetchedCurrentEvents.push(...eventsForDay);
                }
            } catch (err) {
                console.error(`Error fetching events for day ${dateString}:`, err);
                // Continue to fetch for other days
            }
        }
    } else {
        console.log("recommend_schedule called with no selectedDays or invalid format.");
    }

    const scheduleAssistantResult = await getScheduleRecommendations({
        message: originalUserRequest, // Direct parameter
        schedules: fetchedCurrentEvents,
        selectedDays: selectedDays
    });

    let processedRawData = { responseText: scheduleAssistantResult.response };
    if (scheduleAssistantResult.intent === 'recommend' &&
        scheduleAssistantResult.rawData &&
        scheduleAssistantResult.rawData.recommendations) {
        processedRawData.recommendations = scheduleAssistantResult.rawData.recommendations;
    }

    return {
        name: "recommend_schedule", // This is the tool name
        rawData: processedRawData
    };
}

async function executeGoogleSearch({query}){
    try{
        const googleSearchResponse = await googleSearchAgent(query);
        const response = {
            name:"use_google_search",
            rawData:googleSearchResponse
        }
        return response;
    }catch(err){
        throw new Error(`Error occurred while executing use_google_search: ${err.message}`);
    }
}

