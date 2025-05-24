import "dotenv/config";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

export async function getWeatherData(latitude,longitude) {
  try {
    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}`,
      { method: "GET" }
    );
    const jsonRes = await response.json();
    return jsonRes;
  } catch (error) {
    console.error(error);
  }
}
