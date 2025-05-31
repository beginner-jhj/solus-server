export function getToolsConfig(Type){
  const getWeatherForecastConfig = {
      name: "get_weather_forecast",
      description: `
      Fetches the weather forecast for a specified location and number of days.
      
      If user ask for a specific location, use that location. 
      If user ask for weather at their current location("what's the weather here", "what's the weather today",...) then latitude and longtitude will be used, but these information won't be passed to you so let the cityName parameter be null and set days parameter.
      `,
      parameters: {
        type: Type.OBJECT,
        properties: {
          cityName: {
            type: Type.STRING,
            description: "The name of the city for the forecast. Omit this parameter if user ask for weather at their current location or do not specify a particular place.",
          },
          days: {
            type: Type.NUMBER,
            description: "The number of days for the forecast, typically between 1 and 3 (e.g., 'today' is 1, 'tomorrow' implies 1 or 2 days, 'next 3 days' implies 3 days). If not specified by user, the system will default to 1.",
          }
        },
        required: ["days"]
      }
    };

    const useGoogleSearchConfig = {
      name: "use_google_search",
      description: "Use this tool to perform a web search when the user's query requires information that is not available in the database.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The search query to perform."
          }
        },
        required: ["query"]
      }
    };


    
    const addScheduleEventConfig = {
      name: "add_schedule_event",
      description: "Adds a new event to user's schedule. Use this when user ask to create a new meeting, appointment, reminder, or any calendar event. Ensure all necessary details like title, date, and start time are captured from user request.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "The title or name of the event."
          },
          date: {
            type: Type.STRING,
            description: `The date of the event in YYYY-MM-DD format. The model must infer this specific date from your queries like 'today', 'tomorrow', 'next Tuesday', or an explicit date.Use today (${new Date().toISOString().split('T')[0]}) as a reference.`
          },
          start_time: {
            type: Type.STRING,
            description: "The start time of the event in HH:MM (24-hour) format. The model must infer this specific time from your queries."
          },
          end_time: {
            type: Type.STRING,
            description: "The end time of the event in HH:MM (24-hour) format. This is optional. Provide if specified by you or reasonably inferable (e.g., a 1-hour meeting)."
          },
          description: {
            type: Type.STRING,
            description: "A brief description or notes for the event."
          },
          event_category: {
            type: Type.STRING,
            description: "Choose one of them: 'Work', 'Personal', 'Study', 'Exercise'."
          }
        },
        required: ["title", "event_category", "date","description"]
      }
    };
    
    const getScheduleEventsConfig = {
      name: "get_schedule_events",
      description: "Retrieves a list of scheduled events based on specified conditions for one or more dates. Each date can have its own time filtering. For example, to get all events for 'tomorrow' and events before 9am for 'day after tomorrow'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          event_queries: {
            type: Type.ARRAY,
            description: "An array of query objects. Each object specifies a date and optional time conditions to fetch events for that particular date.",
            items: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "The specific date to query for events, in YYYY-MM-DD format. The AI model must infer this specific date from user queries like 'today', 'tomorrow', 'next Tuesday', or an explicit date. If the user requests a full month view (e.g., 'this month's schedule', 'May schedule'), set the day portion as 'all', like '2025-05-all'."
                },
                time_condition: {
                  type: Type.STRING,
                  description: "The time condition for this date, e.g., 'before', 'after', 'between'. If omitted, all events for the date are fetched."
                },
                time_reference: {
                  type: Type.STRING,
                  description: "The reference time (HH:MM 24-hour format) for the time_condition on this date. Required if time_condition is 'before' or 'after'."
                },
                time_reference_end: {
                  type: Type.STRING,
                  description: "The end reference time (HH:MM 24-hour format) if time_condition is 'between' on this date. Required if time_condition is 'between'."
                }
              },
              required: ["date"]
            }
          }
        },
        required: ["event_queries"] // The 'event_queries' array itself is required
      }
    };
return [getWeatherForecastConfig,addScheduleEventConfig,getScheduleEventsConfig,useGoogleSearchConfig];    
}