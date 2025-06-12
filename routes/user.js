import express from "express";
import { getUserProfileInfo, saveSurveyResult } from "../DB/users.js";
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
      });
    } else {
      throw new Error("Gettting profileImage failed.");
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
      res.status(200).json({ message: "Survey result saved successfully." });
    } else {
      throw new Error("Failed to save survey result.");
    }
  } catch (err) {
    next(err);
  }
});

export default router;
