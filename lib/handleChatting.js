import {controlAgnet} from "./ai/controlAgent.js";

import { weatherService } from "./tools/weatherService.js";
import {addSchedule, getEvents} from "../DB/schedule.js";

export async function handleChatting(userRequest,userMetaData){
    try {
        let responseToMainAsistant = {
            functionResponse:[]
        };
        const response = await controlAgnet(userRequest);
        if(response.functionUsed.length>0){
            const functionResponse = executeFunction(response.functionUsed,userMetaData);
            responseToMainAsistant.functionResponse.push(functionResponse);
        }
        return responseToMainAsistant;
    } catch (error) {
        throw new Error(error);
    }
}

function executeFunction(functionCalls, userMetaData){
    for(const functionCall of functionCalls){
        switch(functionCall.name){
            case "get_weather_forecast":
                return executeWeatherForecast({...functionCall.args,...userMetaData.location});
            case "add_schedule_event":
                return executeAddScheduleEvent({...functionCall.args,userId:userMetaData.userId});
            case "get_schedule_events":
                // The entire functionCall.args should now be { event_queries: [...] }
                return executeGetScheduleEvents({userId: userMetaData.userId, ...functionCall.args});
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

async function executeAddScheduleEvent({userId,title,date,start_time,end_time,description}){
    try{
        const [year,month,day] = date.split("-");
        const [result] = await addSchedule({
            userId,
            title,
            description,
            startTime:start_time,
            endTime:end_time,
            eventCategory:"",
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
            if (!queryItem.date || !/^\d{4}-\d{2}-\d{2}$/.test(queryItem.date)) {
                throw new Error(`Invalid or missing date in event_queries item: ${JSON.stringify(queryItem)}. Expected "YYYY-MM-DD".`);
            }
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


