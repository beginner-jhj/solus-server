import express from "express";
import { auth } from "../middleware/auth.js";

import { handleChatting } from "../lib/handleChatting.js";

const router = express.Router();

router.post("/chat", auth,async (req, res, next) => {
  try {
    const { message, location, userProfileInfo, chatHistory } = req.body;
    const response = await handleChatting(message, {
      id: req.user.id,
      latitude: location?.latitude,
      longitude: location?.longitude,
      userProfileInfo: userProfileInfo,
      chatHistory: chatHistory || [] // Pass chat history to handleChatting
    });
    if(response.determinedFormatType === "error"){
      return res.status(500).json({
        response,
      });
    }
    return res.status(200).json({
      response,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
