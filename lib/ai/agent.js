import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

class Agent {
  #ai = null;
  #model = null;
  constructor({ model = "gemini-2.0-flash", generationConfig = { responseMimeType: "application/json" } }) {
    this.#ai = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    this.#model = this.#ai.getGenerativeModel({ model: model,generationConfig:generationConfig });
  }

  get model() {
    return this.#model;
  }
}

export default Agent;
