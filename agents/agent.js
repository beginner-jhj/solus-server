import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

class Agent {
  #ai = null;
  #model = null;
  constructor({ apiKey, name, role, model = "gemini-2.0-flash" }) {
    this.#ai = new GoogleGenerativeAI(apiKey);
    this.#model = this.#ai.getGenerativeModel({ model: model });
    this.#model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: role,
            },
          ],
        },
      ],
    });
    this.name = name;
  }
}
