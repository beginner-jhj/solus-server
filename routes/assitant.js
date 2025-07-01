import express from "express";
import { auth } from "../middleware/auth.js";
import { getUserSurveyResult,saveSurveyResult } from "../DB/users.js";
import { handleChatting } from "../lib/handleChatting.js";
import { getSuggestionModelResponse } from "../lib/ai/suggestionModel.js";
import { surveyModel } from "../lib/ai/surveyModel.js";

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
    console.log(response.response);
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
    return res.status(200).json({
      data:response,
    });
  } catch (error) {
    next(error);
  }
})

router.post("/survey",auth,async (req,res,next)=>{
  try {
    const {surveyHistory,nextStep,structuredAnswerHistory} = req.body;
    const response = await surveyModel(surveyHistory,nextStep,structuredAnswerHistory);
    if(response.surveyDone && response.finalStructuredAnswer){
      const {nickname,likes,location,personalGoal,dailyRoutine} = response.finalStructuredAnswer;
      const {success} = await saveSurveyResult({
        id: req.user.id,
        nickname,
        likes,
        location,
        personalGoal,
        dailyRoutine,
      });
      if(!success){
        throw new Error("Failed to save survey result.");
      }
      return res.status(200).json({
        success:true,
        data:response,
      });
    }
    return res.status(200).json({
      success:true,
      data:response,
    });
  } catch (error) {
    next(error);
  }
})

export default router;
