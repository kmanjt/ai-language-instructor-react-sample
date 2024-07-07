// OpenAI.js
import axios from "axios";

const openAIEndpoint = process.env.NEXT_PUBLIC_OPENAI_ENDPOINT;
const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export const getChatGPTResponse = async (inputText) => {
  // Define the role and context of the ChatGPT conversation
  const context =
    "As a language teaching mentor, provide very concise and conversational guidance. Ask for additional context where required and keep all of your conversations related to learning languages, and avoid discussing anything inappropriate for professional environments.";
  try {
    const response = await axios.post(
      openAIEndpoint,
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: context },
          { role: "user", content: inputText },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content; // Return the ChatGPT's response
  } catch (error) {
    console.error("Error fetching response from OpenAI:", error);
    return null;
  }
};
