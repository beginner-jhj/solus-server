import { pool } from "./pool.js";

/**
 *
 * @param {string} email - User's google email.
 * @param {string} name - User's name.
 * @param {string} profileImage - User's google profile image url.
 *
 * @returns {object}
 */

export async function loginUser({ email, name, profileImage }) {
  const query1 = "SELECT id,email FROM users WHERE email = ?";
  const query2 = "INSERT INTO users(email, name, profile_image) VALUES (?,?,?)";

  try {
    const isRegistered = (await pool.execute(query1, [email]))[0].length === 1;
    if (!isRegistered) {
      await pool.execute(query2, [email, name, profileImage]);
    }
    const [result] = await pool.execute(query1, [email]);
    return { success: true, result: result };
  } catch (err) {
    console.error("User register failed:", err);
    return { success: false };
  }
}

export async function getUserProfileInfo(id) {
  const query = "SELECT profile_image, name FROM users WHERE id=?";
  try {
    const [result] = await pool.execute(query, [id]);
    return { success: true, result: result };
  } catch (err) {
    console.error("Query execution failed:", err);
    return { success: false };
  }
}

export async function saveSurveyResult({ id, likes, location, nickname, personalGoal, dailyRoutine }) {
  const query = `UPDATE users SET likes = ?, location = ?, nickname = ?, personal_goal = ?, daily_routine = ? WHERE id = ?`;
  try {
    const [result] = await pool.execute(query, [JSON.stringify(likes), location, nickname, personalGoal, dailyRoutine, id]);
    return { success: true, result };
  } catch (err) {
    console.error("Saving survey result failed:", err);
    return { success: false };
  }
}

export async function getUserSurveyResult(id) {
  const query = "SELECT likes, location, nickname, personal_goal, daily_routine FROM users WHERE id=?";
  try {
    const [result] = await pool.execute(query, [id]);
    return { success: true, result: result };
  } catch (err) {
    console.error("Query execution failed:", err);
    return { success: false };
  }
}

export async function updateUserProfile({ id, likes, location, nickname, personalGoal, dailyRoutine }) {
  try {
    const [current] = await pool.execute(
      "SELECT likes, location, nickname, personal_goal, daily_routine FROM users WHERE id=?",
      [id]
    );
    if (current.length === 0) {
      return { success: false };
    }
    const updatedLikes = likes !== undefined ? JSON.stringify(likes) : current[0].likes;
    const updatedLocation = location !== undefined ? location : current[0].location;
    const updatedNickname = nickname !== undefined ? nickname : current[0].nickname;
    const updatedPersonalGoal = personalGoal !== undefined ? personalGoal : current[0].personal_goal;
    const updatedDailyRoutine = dailyRoutine !== undefined ? dailyRoutine : current[0].daily_routine;

    const query = `UPDATE users SET likes = ?, location = ?, nickname = ?, personal_goal = ?, daily_routine = ? WHERE id = ?`;
    const [result] = await pool.execute(query, [updatedLikes, updatedLocation, updatedNickname, updatedPersonalGoal, updatedDailyRoutine, id]);
    return { success: true, result };
  } catch (err) {
    console.error("Updating user profile failed:", err);
    return { success: false };
  }
}
