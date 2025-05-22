// To run this test: node test_control_tower.js
// IMPORTANT: This script now calls live Google Search APIs for
// 'web_search' and 'research_task' intents.
// Ensure you have GOOGLE_API_KEY (for general AI functions),
// GOOGLE_SEARCH_API_KEY, and GOOGLE_SEARCH_ENGINE_ID
// set in your environment (e.g., in a .env file loaded by your application).
// Otherwise, these services might return error messages or fail.

import { handleAssistantRequest } from "./lib/aiService.js";

const testInputs = [
  "Can you summarize my schedule for tomorrow morning?",
  "What is the capital of France?",
  "Find me news about renewable energy.",
  "Explain the theory of relativity in simple terms.",
  "My dentist appointment is on August 10th at 2:30 PM.",
  "Just want to chat, how are you doing today?",
  "What were my main events last week?",
  "Book a flight to New York for next Tuesday evening."
];

const runTests = async () => {
  for (const input of testInputs) {
    console.log(`Testing input: ${input}`);
    try {
      const response = await handleAssistantRequest(input);
      console.log("Response:");
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error during test for input:", input);
      console.error(JSON.stringify(error, null, 2)); // Stringify error for better visibility if it's an object
    }
    console.log("------------------------------------");
  }
};

runTests();
