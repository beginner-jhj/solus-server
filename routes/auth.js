import express from "express";
import { loginUser } from "../DB/users.js";
import { generateJWT, verifyJWT } from "../lib/token.js";

const router = express.Router();

router.post("/check_token", (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res
      .status(401)
      .json({ message: "refreshToken expired.", expiredToken: "refreshToken" });

    return;
  }

  if (!accessToken && refreshToken) {
    const { id, email } = verifyJWT(refreshToken);

    const newAccessToken = generateJWT(id, email, "access");
    res.status(200).json({
      message: "accessToken expired.",
      expiredToken: "accessToken",
      accessToken: newAccessToken,
    });
    return;
  }

  // const { id, email } = verifyJWT(refreshToken);

  // console.log("id:", id);
  // console.log("email:", email);

  res.status(200).json({ message: "Tokens exist.", accessToken: accessToken });
});

router.post("/login", async (req, res, next) => {
  const googleAccessToken = req.body.accessToken;
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      }
    );
    const jsonResponse = await response.json();
    const { email, given_name, picture } = jsonResponse;

    const { success, result } = await loginUser({
      email: email,
      name: given_name,
      profileImage: picture,
    });
    if (success) {
      const { id, email } = result[0];
      const accessToken = generateJWT(id, email, "access");
      const refreshToken = generateJWT(id, email, "refresh");

      res.status(200).json({
        message: "User registered successfully.",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } else {
      throw new Error("Failed to register a user.");
    }
  } catch (err) {
    next(err);
  }
});

export default router;
