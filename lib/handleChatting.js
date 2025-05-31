import {controlAgent} from "./ai/controlAgent.js";
import {googleSearchAgent} from "./ai/googleSearchAgent.js";
import { mainAgent } from "./ai/mainAgent.js";
import { getScheduleRecommendations } from "./ai/scheduleRecommender.js";

import { weatherService } from "./tools/weatherService.js";
import {addSchedule, getEvents} from "../DB/schedule.js";

export async function handleChatting(userRequest,userMetaData){
    try {
        let responseToMainAsistant = {
            originalUserRequest:userRequest,
            functionResponse:[],
            googleSearchResponse:null,
            userProfileInfo:userMetaData.userProfileInfo
        };
        const response = await controlAgent(userRequest);
        if(response.functionUsed.length>0){
            const functionResponse = await executeFunction(response.functionUsed,userMetaData, response.originalUserInput);
            responseToMainAsistant.functionResponse.push(functionResponse);
        }

        if(response.googleSearchQuery){
            const googleSearchResponse = await googleSearchAgent(response.googleSearchQuery);
            responseToMainAsistant.googleSearchResponse = googleSearchResponse;
        }

        const formattedResponseToMainAsistant = formatResponseToMainAssistant(responseToMainAsistant);
        console.log("formattedResponseToMainAsistant:",formattedResponseToMainAsistant);
        const mainAgentResponse = await mainAgent(formattedResponseToMainAsistant);
        console.log("mainAgentResponse:",mainAgentResponse);
        return mainAgentResponse;
    } catch (error) {
        console.error("Error in handleChatting:", error);
        return {
          response: "I'm sorry, something went wrong while processing your request. Please try again.",
          summary: "Error processing request",
          user_intent_summary: "N/A - Error occurred before main agent processing",
          new_user_preference: [],
          next_step: {
            suggestion: "Try rephrasing your request or wait a moment before trying again.",
            type: "suggestion"
          },
          metadata: {
            topic: "Error",
            tone: "apologetic"
          },
          determinedFormatType: "error"
        };
    }
}

function formatResponseToMainAssistant(responseToMainAsistant){
    return `
        Original User Request: ${responseToMainAsistant.originalUserRequest}
        Function Response: ${JSON.stringify(responseToMainAsistant.functionResponse)}
        Google Search Response: ${responseToMainAsistant.googleSearchResponse}
        User Profile Info: ${JSON.stringify(responseToMainAsistant.userProfileInfo)}
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

