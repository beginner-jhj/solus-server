import express from "express";
import { handleAssistantRequest } from "../lib/aiService.js";

const router = express.Router();

router.post("/chat", async (req, res, next) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "userInput is required" });
  }

  try {
    const result = await handleAssistantRequest(userInput);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    // Check if the error is a structured error from handleAssistantRequest
    if (error && error.error && error.details) {
        return res.status(500).json({
            error: error.error,
            details: error.details,
            // Optionally include routingDecision and subModelResponse if they exist and are safe to send
            routingDecision: error.routingDecision,
            subModelResponse: error.subModelResponse
        });
    }
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

export default router;
