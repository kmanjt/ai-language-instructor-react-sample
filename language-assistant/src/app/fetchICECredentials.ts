import axios from 'axios';

export async function fetchICECredentials() {
  const url = 'https://westeurope.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1';
  const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SUBSCRIPTION_KEY;

  try {
    const response = await axios.get(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return {
      iceServerUrl: response.data.Urls[0],
      iceServerUsername: response.data.Username,
      iceServerPassword: response.data.Password
    };
  } catch (error : any ) {
    console.error('Error fetching ICE credentials:', error.response ? error.response.data : error.message);
    throw error; // It's generally a good practice to re-throw the error after logging it
  }
}
