import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getEvents,
  deleteEvent,
  addSchedule,
  completeEvent,
  editEvent,
} from "../DB/schedule.js";

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

export default router;
