import "dotenv/config";
import jwt from "jsonwebtoken";

/**
 *
 * @param {string} id - User's id
 * @param {string} email - User's email
 * @param {string} type - User's type
 */

export function generateJWT(id, email, type) {
  return jwt.sign(
    {
      id: id,
      email: email,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: type === "access" ? "1h" : "30d",
    }
  );
}

export function verifyJWT(token) {
  return jwt.verify(token, process.env.JWT_SECRET_KEY);
}
