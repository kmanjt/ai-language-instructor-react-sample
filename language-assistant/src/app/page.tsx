  'use client';
  import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
  import { fetchICECredentials } from './fetchICECredentials';
  import { getChatGPTResponse } from './openAI';
  import React, { useEffect, useRef, useState } from 'react';

  require('dotenv').config();

  interface TokenData {
    token?: string;
    error?: string;
  }

  interface ICEServerData {
    url: string;
    username: string;
    password: string;
  }

  const Home: React.FC = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [avatarSynthesizer, setAvatarSynthesizer] = useState<sdk.AvatarSynthesizer | null>(null);
    const [data, setData] = useState<TokenData>({});
    const [iceData, setIceData] = useState<ICEServerData | null>(null);

    const subscriptionKey: string = process.env.NEXT_PUBLIC_AZURE_SUBSCRIPTION_KEY as string;
    const serviceRegion: string = "westeurope";

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      async function fetchData() {
        try {
          const iceCredentials = await fetchICECredentials();
          setIceData({
            url: iceCredentials.iceServerUrl,
            username: iceCredentials.iceServerUsername,
            password: iceCredentials.iceServerPassword
          });
          await setupAvatarAndWebRTC();
        } catch (error) {
          console.error('Failed to fetch ICE credentials:', error);
        }
      };

      fetchData();
    }, []);

    useEffect(() => {
      if (iceData) {
        setupAvatarAndWebRTC();
      }
    }, [iceData]);

    const setupAvatarAndWebRTC = async () => {
      if (!iceData) {
        console.error("ICE data is not available.");
        return;
      }
    
      const newPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: iceData.url, username: iceData.username, credential: iceData.password }]
      });
    
      // Attach tracks to the video and audio elements
      newPeerConnection.ontrack = function (event) {
        if (event.track.kind === 'video' && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        } else if (event.track.kind === 'audio' && audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };
    
      // Setup transceivers for receiving video and audio data
      newPeerConnection.addTransceiver('video', { direction: 'sendrecv' });
      newPeerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    
      const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      const avatarConfig = new sdk.AvatarConfig("lisa", "casual-sitting", new sdk.AvatarVideoFormat());
      const synthesizer = new sdk.AvatarSynthesizer(speechConfig, avatarConfig);
    
      try {
        await synthesizer.startAvatarAsync(newPeerConnection);
        console.log("Avatar initialized and ready to respond.");
        await setAvatarSynthesizer(synthesizer); 
        startSpeechRecognition(synthesizer);  // Start speech recognition after successful initialization
      } catch (error) {
        console.error("Failed to start avatar:", error);
      }
    };
    

    const startSpeechRecognition = (synthesizer: sdk.AvatarSynthesizer) => {
      const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      speechConfig.speechRecognitionLanguage = 'en-US';
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  
      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          console.log(`RECOGNIZED: Text=${e.result.text}`);
          setTranscript(e.result.text);
          respondWithVoice(e.result.text, synthesizer);
        }
      };
  
      recognizer.startContinuousRecognitionAsync();
    };

    // Ensure the function is asynchronous if you're using await inside
    const respondWithVoice = async (text: string, synthesizer: sdk.AvatarSynthesizer) => {
      try {
        const responseText = await getChatGPTResponse(text);
        if (responseText) {
          synthesizer.speakTextAsync(responseText)
            .then(result => {
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                console.log("Speech synthesis completed.");
              } else {
                console.error("Speech synthesis canceled:", result.errorDetails);
              }
            })
            .catch(error => {
              console.error("Error in speech synthesis:", error);
            });
        } else {
          console.log("No response from ChatGPT.");
        }
      } catch (error) {
        console.error("Failed to get response from ChatGPT:", error);
      }
    };
 

    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '400px' }} />
          <audio ref={audioRef} autoPlay />
          {transcript && <p>Heard: {transcript}</p>}
        </div>
      </main>
    );
  };

  export default Home;
