export function weatherDataFormatter(forecast){
    return `
        Response from get_weather_forecast:
        
        ${forecast.map((day)=>{
            return `
                datetime: ${day.datetime}
                condition: ${day.condition}
                temperature: ${day.temperature}
                humidity: ${day.humidity}
                chance_of_rain: ${day.chance_of_rain}
                chance_of_snow: ${day.chance_of_snow}
                wind: ${day.wind}
                uv_index: ${day.uv_index}
            `
        }).join("\n")}
    `
}

export function addScheduleEventFormatter(event){
    return `
        Response from add_schedule_event:
          Added event:
            title: ${event.title}
            description: ${event.description}
            date: ${event.year}-${event.month}-${event.day}
            start_time: ${event.start_time}
            end_time: ${event.end_time}
            event_category: ${event.event_category}
    `
}

export function getScheduleEventsFormatter(events){
    return `
        Response from get_schedule_events:
            Retrieved events:
                ${events.map((event,i)=>{
                    return `
                        ${i+1}. 
                            event_title: ${event.title}
                            event_date: ${event.year}-${event.month}-${event.day}
                            event_time: ${event.start_time}-${event.end_time}
                            event_description: ${event.description}`
                }).join("\n")}
    `
}

export function scheduleRecommendationsFormatter(recommendations){
    return `
        Response from recommend_schedule:
            Recommendations:
                ${recommendations.map((recommendation,i)=>{
                    return `
                        ${i+1}. 
                            title: ${recommendation.title}
                            description: ${recommendation.description}
                            suggestedDate: ${recommendation.suggestedDate}
                            suggestedStartTime: ${recommendation.suggestedStartTime}
                            suggestedEndTime: ${recommendation.suggestedEndTime}
                            suggestedEventCategory: ${recommendation.suggestedEventCategory}`
                }).join("\n")}
    `
}

export function googleSearchFormatter(response){
    try {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        const links = Array.isArray(data.relatedLinks)
            ? data.relatedLinks.map((link, i) => `${i + 1}. ${link.title} - ${link.url}`).join("\n")
            : "";
        return `
        Response from use_google_search:
            searchResult: ${data.searchResult}
            relatedLinks:
                ${links}
        `;
    } catch (err) {
        return `
        Response from use_google_search:
            ${response}
        `;
    }
}

export function completeScheduleEventFormatter(id){
    return `
        Response from complete_schedule_event:
            completed_event_id: ${id}
    `
}

export function updateUserProfileFormatter(updatedFields){
    return `
        Response from update_user_profile:
            ${Object.entries(updatedFields).map(([key,val])=>`${key}: ${Array.isArray(val)?JSON.stringify(val):val}`).join('\n')}
    `
}

