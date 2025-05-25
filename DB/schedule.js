import { pool } from "./pool.js";

export async function addSchedule({userId,title,description,startTime,endTime,eventCategory,year,month,day}){
    const query = "INSERT INTO schedules(user_id,title, description, start_time, end_time, event_category, year, month, day) VALUES (?,?,?,?,?,?,?,?,?)";
    try {
        const [result] = await pool.execute(query,[userId,title,description,startTime,endTime,eventCategory,year,month,day]);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getEvents(
    userId,
    year,
    month,
    day,
    timeCondition = null,             // "before" | "after" | "between" | null
    timeReference = null,            // "HH:MM"
    timeReferenceEnd = null          // "HH:MM" (only for "between")
  ) {
    let query = `
      SELECT * FROM schedules 
      WHERE user_id = ? AND year = ? AND month = ? AND complete = 0
    `;
    const args = [userId, year, month];
  
    if (day !== "all") {
      query += " AND day = ?";
      args.push(day);
    }
  
    if (timeCondition === "before" && timeReference) {
      query += " AND start_time <= ?";
      args.push(timeReference);
    } else if (timeCondition === "after" && timeReference) {
      query += " AND start_time >= ?";
      args.push(timeReference);
    } else if (timeCondition === "between" && timeReference && timeReferenceEnd) {
      query += " AND start_time >= ? AND start_time <= ?";
      args.push(timeReference, timeReferenceEnd);
    }
  
    query += " ORDER BY day ASC, start_time ASC";
  
    try {
      const [rows] = await pool.execute(query, args);
      return rows;
    } catch (error) {
      throw error;
    }
  }
  
  

export async function deleteEvent(id){
    const query = "DELETE FROM schedules WHERE id = ?";
    try {
        const [result] = await pool.execute(query,[id]);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function completeEvent(id){
    const query = "UPDATE schedules SET complete = 1 WHERE id = ?";
    try {
        const [result] = await pool.execute(query,[id]);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function editEvent({id,title,description,startTime,endTime,eventCategory}){
    const query = "UPDATE schedules SET title = ?, description = ?, start_time = ?, end_time = ?, event_category = ? WHERE id = ?";
    try {
        const [result] = await pool.execute(query,[title,description,startTime,endTime,eventCategory,id]);
        return result;
    } catch (error) {
        throw error;
    }
}