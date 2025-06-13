import {controlAgent} from "./ai/controlAgent.js";
import {googleSearchAgent} from "./ai/googleSearchAgent.js";
import { mainAgent } from "./ai/mainAgent.js";
import { getScheduleRecommendations } from "./ai/scheduleRecommender.js";
import { weatherDataFormatter, googleSearchFormatter, scheduleRecommendationsFormatter,getScheduleEventsFormatter,addScheduleEventFormatter, updateUserProfileFormatter, completeScheduleEventFormatter } from "./tools/formatter.js";
import { identifyScheduleToComplete } from "./ai/scheduleCompletionIdentifier.js";

import { weatherService } from "./tools/weatherService.js";
import {addSchedule, getEvents, completeEvent} from "../DB/schedule.js";
import { updateUserProfile } from "../DB/users.js";

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
        
        // Log the request for monitoring
        console.log(`Processing request from user ${userMetaData.id}: ${userRequest.substring(0, 100)}${userRequest.length > 100 ? '...' : ''}`);
        
        // Get function calls from control agent

        const response = await controlAgent(userRequest, userMetaData.chatHistory,userMetaData.userProfileInfo);
        let functionResponses = [];
        const instructionFromControlAgent = response.instructionFromControlAgent;
        
        // Execute functions if any were returned
        if(response.functionUsed && response.functionUsed.length > 0){
            try {
                functionResponses = await executeFunction(response.functionUsed, userMetaData, response.originalUserInput);
                // Collect all results returned from executeFunction
            } catch (functionError) {
                console.error("Error executing function:", functionError);
                // Continue processing even if function execution fails
            }
        }

        // Call the main agent with the entire formatted string rather than an object
        const mainAgentResponse = await mainAgent(userRequest,userMetaData.chatHistory,userMetaData.userProfileInfo,functionResponses,instructionFromControlAgent);
        
        // Add performance metrics
        const executionTime = Date.now() - startTime;
        mainAgentResponse.performance_metrics = {
            execution_time_ms: executionTime,
            timestamp: new Date().toISOString(),
            functions_called: response.functionUsed ? response.functionUsed.length : 0,
            google_search_performed: functionResponses.some(fr => fr.name === "use_google_search")
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

async function executeFunction(functionCalls, userMetaData, originalUserRequest){
    const results = [];
    for (const functionCall of functionCalls) {
        console.log("functionCall:", functionCall);
        switch (functionCall.name) {
            case "get_weather_forecast":
                results.push(await executeWeatherForecast({
                    ...functionCall.args,
                    latitude: userMetaData.latitude,
                    longitude: userMetaData.longitude
                }));
                break;
            case "add_schedule_event":
                results.push(await executeAddScheduleEvent({
                    ...functionCall.args,
                    userId: userMetaData.id
                }));
                break;
            case "get_schedule_events":
                // The entire functionCall.args should now be { event_queries: [...] }
                results.push(await executeGetScheduleEvents({
                    userId: userMetaData.id,
                    ...functionCall.args
                }));
                break;
            case "complete_schedule_event":
                results.push(await executeCompleteScheduleEvent(functionCall.args, userMetaData));
                break;
            case "use_google_search":
                results.push(await executeGoogleSearch(functionCall.args));
                break;
            case "recommend_schedule":
                results.push(await executeRecommendSchedule(functionCall.args, userMetaData, originalUserRequest));
                break;
            case "update_user_profile":
                results.push(await executeUpdateUserProfile(functionCall.args, userMetaData.id));
                break;
            default:
                throw new Error(`Invalid function name: ${functionCall.name}`);
        }
    }
    return results;
}

async function executeWeatherForecast({ latitude, longitude, cityName = null, days = 1 }) {
    try {
        if ((!latitude && !longitude) && !cityName) {
            throw new Error("Please provide latitude, longitude or cityName");
        }

        const weatherData = await weatherService(latitude, longitude, cityName, days);

        const formattedWeatherData = weatherDataFormatter(weatherData);


        const summary = weatherData
            .slice(0, 5)
            .map((d) => `${d.datetime} - ${d.condition}, ${d.temperature}`)
            .join("\n");

        return {
            name: "get_weather_forecast",
            summary,
            formattedData: formattedWeatherData

        };
    } catch (err) {
        throw new Error(`Error occurred while executing get_weather_forecast: ${err}`);
    }
}

async function executeAddScheduleEvent({ userId, title, date, start_time, end_time, description, event_category }) {
    try {
        const [year, month, day] = date.split("-");
        const startTime = start_time === undefined ? "" : start_time;
        const endTime = end_time === undefined ? "" : end_time;
        await addSchedule({
            userId,
            title,
            description,
            startTime,
            endTime,
            eventCategory: event_category,
            year,
            month,
            day
        });

        const summary = `Event '${title}' on ${date} ${startTime}${endTime ? `-${endTime}` : ""}`;

        const formattedAddScheduleEvent = addScheduleEventFormatter({title,description,year,month,day,startTime,endTime,event_category});

        return {
            name: "add_schedule_event",
            summary,
            formattedData: formattedAddScheduleEvent
        };
    } catch (err) {
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

        const summary = allEvents.length > 0
            ? allEvents
                .map(ev => `${ev.year}-${ev.month}-${ev.day} ${ev.start_time || ''}${ev.end_time ? '-' + ev.end_time : ''} ${ev.title}`)
                .join("\n")
            : "No events found.";

        const formattedGetScheduleEvents = getScheduleEventsFormatter(allEvents);

        return {
            name: "get_schedule_events",
            summary,
            formattedData: formattedGetScheduleEvents
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
        message: originalUserRequest,
        schedules: fetchedCurrentEvents,
        selectedDays: selectedDays
    });

    let processedRawData = scheduleAssistantResult.data.recommendations;

    const formattedScheduleRecommendations = scheduleRecommendationsFormatter(processedRawData);

    return {
        name: "recommend_schedule", // This is the tool name
        summary: scheduleAssistantResult.summary,
        formattedData: formattedScheduleRecommendations
    };
}

async function executeGoogleSearch({ query }) {
    try {
        const googleSearchResponse = await googleSearchAgent(query);

        const summary = googleSearchResponse.length > 200
            ? googleSearchResponse.slice(0, 200) + "..."
            : googleSearchResponse;

        const formattedGoogleSearchResponse = googleSearchFormatter(googleSearchResponse);

        return {
            name: "use_google_search",
            summary,
            formattedData: formattedGoogleSearchResponse

        };
    } catch (err) {
        throw new Error(`Error occurred while executing use_google_search: ${err.message}`);
    }
}

async function executeCompleteScheduleEvent({ user_query, event_queries }, userMetaData) {
    try {
        let allEvents = [];
        if (event_queries && Array.isArray(event_queries)) {
            for (const query of event_queries) {
                const [year, month, day] = query.date.split("-");
                const events = await getEvents(
                    userMetaData.id,
                    year,
                    month,
                    day,
                    query.time_condition,
                    query.time_reference,
                    query.time_reference_end
                );
                if (events && events.length > 0) {
                    allEvents.push(...events);
                }
            }
        }
        const identifyRes = await identifyScheduleToComplete(user_query, allEvents);
        for (const item of identifyRes) {
            if (!item.failedToFindExactSchedule && item.id) {
                await completeEvent(item.id);
            }
        }
        const formatted = completeScheduleEventFormatter(identifyRes);
        return {
            name: "complete_schedule_event",
            summary: identifyRes.response,
            formattedData: formatted
        };
    } catch (err) {
        throw new Error(`Error occurred while executing complete_schedule_event: ${err.message}`);
    }
}


async function executeUpdateUserProfile(args, userId) {
    try {
        const updateResult = await updateUserProfile({ id: userId, ...args });
        if (!updateResult.success) {
            throw new Error("DB update failed");
        }
        const formatted = updateUserProfileFormatter(args);
        return {
            name: "update_user_profile",
            summary: "Updated user profile information",
            formattedData: formatted
        };
    } catch (err) {
        throw new Error(`Error occurred while executing update_user_profile: ${err.message}`);
    }
}

