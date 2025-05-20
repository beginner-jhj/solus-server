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
