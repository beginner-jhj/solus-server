/**
 * Formats a response according to the standard AI assistant response schema.
 *
 * @param {string} intent - The determined intent of the user's request.
 * @param {string} responseText - The final answer text to be shown to the user.
 * @param {string} [formatType="text"] - Optional. The format of the response text (e.g., "text", "markdown", "html"). Defaults to "text".
 * @param {Object} [rawData={}] - Optional. Any raw data that might be useful for the client (e.g., calendar data, weather data).
 * @param {string|null} [modelUsed=null] - Optional. The name or identifier of the AI model used.
 * @param {string|null} [toolUsed=null] - Optional. The name or identifier of the tool used, if any.
 * @returns {Object} The standardized response object.
 */
export function formatStandardResponse(intent, responseText, formatType = "text", rawData = {}, modelUsed = null, toolUsed = null) {
  const standardResponse = {
    intent: intent,
    response: responseText,
    formatType: formatType,
  };

  if (Object.keys(rawData).length > 0) {
    standardResponse.rawData = rawData;
  }
  if (modelUsed) {
    standardResponse.modelUsed = modelUsed;
  }
  if (toolUsed) {
    standardResponse.toolUsed = toolUsed;
  }

  return standardResponse;
}
