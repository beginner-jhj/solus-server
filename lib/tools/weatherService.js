import "dotenv/config";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const summarizeWeatherData = (data)=> {
  return {
    datetime: data.time,
    condition: data.condition.text.trim(),
    temperature: `${data.temp_c}°C (feels like ${data.feelslike_c}°C)`,
    humidity: `${data.humidity}%`,
    chance_of_rain: `${data.chance_of_rain}%`,
    chance_of_snow: `${data.chance_of_snow}%`,
    wind: `${data.wind_kph} kph from ${data.wind_dir}`,
    uv_index: data.uv
  };
}


export async function weatherService(latitude,longitude) {
  try {
    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}`,
      { method: "GET" }
    );
    const jsonRes = await response.json();
    const forecastData = jsonRes.forecast.forecastday[0].hour;
    const summarizedData = forecastData.map(summarizeWeatherData);
    return summarizedData;
  } catch (error) {
    console.error(error);
  }
}
