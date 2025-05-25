export function createPrompt({role="", context="", instructions=[], goal="", constraints=[], outputFormat="", examples="", userInput="",language="English"}) {
    return `
            You are a ${role}

            Context:
                ${context}

            Instructions:
                ${instructions.map((instruction,index) => ` ${index+1}. ${instruction}`).join("\n")}

            Goal:
                ${goal}

            Constraints:
                ${constraints.map((constraint,index) => ` ${index+1}. ${constraint}`).join("\n")}

            Output Format:
                ${outputFormat}

            Language:
                Your default language is ${language}.
                However, if the user input is clearly written in another language, you must respond in that detected language instead.
                Always respond in the same language that the user used.
                Use natural, human-like expressions for that language, and never mix multiple languages in the same response.

            Examples:
                ${examples}

            User Input:
                ${userInput}
      `;
}
