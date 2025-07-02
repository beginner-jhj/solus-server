import express from "express";
import { getUserProfileInfo, saveSurveyResult, getUserSurveyResult,deleteAccount,updateUserProfile } from "../DB/users.js";
import { verifyJWT } from "../lib/token.js";

const router = express.Router();

router.get("/get_profile", async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    if (!accessToken) {
      throw new Error("Access token not found.");
    }
    const { id } = verifyJWT(accessToken);
    const { success, result } = await getUserProfileInfo(id);
    if (success) {
      res.status(200).json({
        profileImage: result[0].profile_image,
        name: result[0].name,
        createdAt: result[0].created_at,
      });
    } else {
      throw new Error("Gettting profileImage failed.");
    }
  } catch (err) {
    next(err);
  }
});

router.get("/get_survey_result", async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    if (!accessToken) {
      throw new Error("Access token not found.");
    }
    const { id } = verifyJWT(accessToken);
    const { success, result } = await getUserSurveyResult(id);
    if (success) {
      res.status(200).json({
        surveyResult: result,
      });
    } else {
      throw new Error("Gettting survey result failed.");
    }
  } catch (err) {
    next(err);
  }
});

router.post("/save_survey_result", async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      throw new Error("Access token not found.");
    }
    const { id } = verifyJWT(accessToken);

    const { likes, location, nickname, personalGoal, dailyRoutine } = req.body;

    const { success } = await saveSurveyResult({
      id,
      likes,
      location,
      nickname,
      personalGoal,
      dailyRoutine,
    });

    if (success) {
      res.status(200).json({ success:true,message: "Survey result saved successfully." });
    } else {
      throw new Error("Failed to save survey result.");
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/delete_account", async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      throw new Error("Access token not found.");
    }
    const { id } = verifyJWT(accessToken);
    const { success } = await deleteAccount(id);
    if (success) {
      res.status(200).json({ success:true, message: "User deleted successfully." });
    } else {
      throw new Error("Failed to delete user.");
    }
  } catch (err) {
    next(err);
  }
});

router.put("/update_user_profile", async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      throw new Error("Access token not found.");
    }
    const { id } = verifyJWT(accessToken);
    const { likes, location, nickname, personal_goal, daily_routine,prefered_language } = req.body;
    const { success } = await updateUserProfile({
      id,
      likes,
      location,
      nickname,
      personalGoal:personal_goal,
      dailyRoutine:daily_routine,
      preferedLanguage:prefered_language,
    });
    if (success) {
      res.status(200).json({ success:true, message: "User profile updated successfully." });
    } else {
      throw new Error("Failed to update user profile.");
    }
  } catch (err) {
    next(err);
  }
});

export default router;
