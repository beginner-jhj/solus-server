import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getEvents,
  deleteEvent,
  addSchedule,
  completeEvent,
  editEvent,
} from "../DB/schedule.js";
import { sendMessageToChat, makeScheduleChatPrompt } from "../lib/aiService.js";

const router = express.Router();

// Add event
router.post("/add_event", auth, async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      eventCategory,
      year,
      month,
      day,
    } = req.body;

    const result = await addSchedule({
      userId: req.user.id,
      title,
      description,
      startTime,
      endTime,
      eventCategory,
      year,
      month,
      day,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: "Event created successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get events
router.get("/get_events", auth, async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const result = await getEvents(req.user.id, year, month, day);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete("/delete_event", auth, async (req, res) => {
  try {
    const { id } = req.query;
    const result = await deleteEvent(id);

    res.status(200).json({
      success: true,
      data: result,
      message: "Event deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Complete event
router.put("/complete_event", auth, async (req, res) => {
  try {
    const { id } = req.query;
    const result = await completeEvent(id);

    res.status(200).json({
      success: true,
      data: result,
      message: "Event completed successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.put("/edit_event", auth, async (req, res) => {
    try {
        const { id } = req.query;
        const {title,description,startTime,endTime,eventCategory} = req.body;
        const result = await editEvent({id,title,description,startTime,endTime,eventCategory});

        res.status(200).json({
            success: true,
            data: result,
            message: "Event edited successfully",
        });
    } catch (error) {
        next(error);
    }
});

router.post("/chat", auth, async (req, res, next) => {
  try {
    const { message, days, action, preferedLanguage } = req.body;

    let schedules = [];
    let selectedDays = [];

    for (let i = 0; i < days.length; i++) {
      const { month, day } = days[i];
      const result = await getEvents(
        req.user.id,
        new Date().getFullYear(),
        month,
        day
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

    let prompt;
    let response;

    switch (action) {
      case "Report":
        prompt = makeScheduleChatPrompt(
          "Report my schedule.",
          formattedSchedules,
          selectedDays,
          preferedLanguage
        );

        response = await sendMessageToChat("schedule", prompt);
        res.status(200).json({
          response,
        });
        break;
      case "Recommend":
        prompt = makeScheduleChatPrompt(
          "Recommend schedules based on my schedule.",
          formattedSchedules,
          selectedDays,
          preferedLanguage
        );

        response = await sendMessageToChat("schedule", prompt);
        res.status(200).json({
          response,
        });
        break;
      default:
        prompt = makeScheduleChatPrompt(
          message,
          formattedSchedules,
          selectedDays,
          preferedLanguage
        );

        response = await sendMessageToChat("schedule", prompt);
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
