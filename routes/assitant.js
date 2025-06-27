import express from "express";
import { auth } from "../middleware/auth.js";
import { getUserSurveyResult } from "../DB/users.js";
import { handleChatting } from "../lib/handleChatting.js";
import { getSuggestionModelResponse } from "../lib/ai/suggestionModel.js";

const router = express.Router();

router.post("/chat", auth,async (req, res, next) => {
  try {
    const { message, currentLocation, chatHistory, clientDate, clientTime } = req.body;
    const {success, result} = await getUserSurveyResult(req.user.id);
    if(!success){
      throw new Error("Failed to get user survey result.");
    }
    const userProfileInfo = {
      nickname: result[0].nickname,
      likes: result[0].likes,
      location: result[0].location,
      personal_goal: result[0].personal_goal,
      daily_outline: result[0].daily_outline,
    };
    const response = await handleChatting(message, {
      id: req.user.id,
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      userProfileInfo: userProfileInfo,
      chatHistory: chatHistory || [], // Pass chat history to handleChatting
      clientDate: clientDate,
      clientTime: clientTime,
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

router.post("/get_suggestion",auth,async (req,res,next)=>{
  try {
    const {hasSchedule,schedule,clientDate,clientTime} = req.body;
    const {success, result} = await getUserSurveyResult(req.user.id);
    if(!success){
      throw new Error("Failed to get user survey result.");
    }
    const userProfileInfo = {
      nickname: result[0].nickname,
      likes: result[0].likes,
      location: result[0].location,
      personal_goal: result[0].personal_goal,
      daily_outline: result[0].daily_outline,
    };
    const response = await getSuggestionModelResponse(hasSchedule,schedule,userProfileInfo,clientTime,clientDate);
    console.log(response);
    return res.status(200).json({
      response,
    });
  } catch (error) {
    next(error);
  }
})

export default router;
