import express from "express";
import { auth } from "../middleware/auth.js";

import { sendMessageToScheduleAssistant } from "../lib/ai/scheduleAssistant.js";
import { getEvents } from "../DB/schedule.js";
import { handleUserChat } from "../lib/handleAiService.js";
import { handleChatting } from "../lib/handleChatting.js";

const router = express.Router();

router.post("/chat", auth,async (req, res, next) => {
  try {
    const { message,location } = req.body;
    const response = await handleChatting(message,{id:req.user.id,latitude:location?.latitude,longitude:location?.longitude,userProfileInfo:{
      "likes": [
        "coffee",
        "jazz music",
        "quiet mornings",
        "sci-fi movies",
        "coding at night"
      ],
      "dislikes": [
        "crowded places",
        "spicy food",
        "waking up early",
        "slow internet",
        "long meetings"
      ],
      "hobbies": [
        "painting",
        "hiking on weekends",
        "building side projects",
        "photography",
        "reading non-fiction"
      ],
      "personalityTraits": [
        "introverted",
        "detail-oriented",
        "curious",
        "organized",
        "quick learner"
      ]
    }
    });
    res.status(200).json({
      response,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/chat/schedule", auth, async (req, res, next) => {
  try {
    const { message, days, action } = req.body;

    let schedules = [];
    let selectedDays = [];

    for (let i = 0; i < days.length; i++) {
      const { month, day } = days[i];
      const result = await getEvents(
        req.user.id,
        new Date().getFullYear(),
        month,
        day,
      );
      schedules.push(...result);
      selectedDays.push({ year: new Date().getFullYear(), month, day });
    }

    const formattedSchedules = schedules.map((schedule) => {
      return {
        title: schedule.title,
        description: schedule.description,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        eventCategory: schedule.eventCategory,
        year: schedule.year,
        month: schedule.month,
        day: schedule.day,
      };
    });

    let response;

    switch (action) {
      case "Report":

        response = await sendMessageToScheduleAssistant({message:"Report my schedule.",schedules:formattedSchedules,selectedDays:selectedDays});
        res.status(200).json({
          response,
        });
        break;
      case "Recommend":

        response = await sendMessageToScheduleAssistant({message:"Recommend schedules based on my schedule.",schedules:formattedSchedules,selectedDays:selectedDays});
        res.status(200).json({
          response,
        });
        break;
      default:
        response = await sendMessageToScheduleAssistant({message:message,schedules:formattedSchedules,selectedDays:selectedDays});
        res.status(200).json({
          response,
        });
        break;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
