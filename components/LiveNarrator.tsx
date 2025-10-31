import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { GoogleGenAI } from '@google/genai';
import { StoryStep, NarrationRef } from '../types';
import { generateSpeech, interpretUserChoice } from '../services/geminiService';
import { decode, decodeAudioData } from '../lib/audioUtils';
import { translations } from '../lib/translations';

export type NarrationState = 'IDLE' | 'NARRATING' | 'LISTENING' | 'PROCESSING';

// FIX: Add comprehensive type definitions for the Web Speech API to resolve TypeScript errors.
// A TSDoc-style declaration for the SpeechRecognition API to satisfy TypeScript
/**
 * @global
 * @interface Window
 */
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  // This is the instance type
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    
    start(): void;
    stop(): void;
    abort(): void;

    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  }

  // This is the constructor type
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
    readonly resultIndex: number;
  }
  
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}


interface LiveNarratorProps {
  storyStep: StoryStep;
  language: 'en' | 'es' | 'pt';
  narrationSpeed: number;
  onChoiceSelected: (choice: string) => void;
  onNarrationStateChange: (state: NarrationState) => void;
  onError: (error: Error) => void;
  clickedChoiceToNarrate: { id: string; choice: string } | null;
}

const LiveNarrator = forwardRef<NarrationRef, LiveNarratorProps>(({ storyStep, language, narrationSpeed, onChoiceSelected, onNarrationStateChange, onError, clickedChoiceToNarrate }, ref) => {
  const aiRef = useRef<GoogleGenAI | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const narrationStateRef = useRef<NarrationState>('IDLE');
  const endOfSpeechTimeoutRef = useRef<number | null>(null);


  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const operationIdRef = useRef<string | null>(null); // To prevent stale async operations

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const updateNarrationState = useCallback((state: NarrationState) => {
    narrationStateRef.current = state;
    onNarrationStateChange(state);
  }, [onNarrationStateChange]);

  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  }, [language]);

  const stopAllAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      // We don't want onended to trigger the next step, so remove it before stopping
      currentAudioSourceRef.current.onended = null;
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.disconnect();
      currentAudioSourceRef.current = null;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    skip: () => {
      // This will stop the audio, and because we cleared onended, it won't trigger resolution of the narrateText promise
      stopAllAudio();
      // Manually trigger the next part of the sequence.
      // We create a new operation ID for this skip action.
      const opId = `${storyStep.id}-skipped`;
      operationIdRef.current = opId;
      const runSkippedSequence = async () => {
        try {
          const promptText = `${t('voiceChoicePrompt')} ${storyStep.choices.join(', ')}`;
          await narrateText(promptText, opId);
          await startListeningForChoice(opId);
        } catch (error) {
           if (!(error as Error).message.includes('Operation cancelled')) {
              onError(error as Error);
           }
        }
      };
      runSkippedSequence();
    }
  }));


  const cleanupSpeechRecognition = useCallback(() => {
    if (endOfSpeechTimeoutRef.current) {
        clearTimeout(endOfSpeechTimeoutRef.current);
        endOfSpeechTimeoutRef.current = null;
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.abort(); 
      speechRecognitionRef.current = null;
    }
    updateNarrationState('IDLE');
  }, [updateNarrationState]);

  const narrateText = useCallback(async (text: string, localOpId: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!aiRef.current || !audioContextRef.current) throw new Error("Audio system not initialized.");
        if (operationIdRef.current !== localOpId) return reject(new Error("Operation cancelled"));
        
        updateNarrationState('NARRATING');
        stopAllAudio();
        
        const base64Audio = await generateSpeech(text);
        if (operationIdRef.current !== localOpId) return reject(new Error("Operation cancelled"));

        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
        if (operationIdRef.current !== localOpId) return reject(new Error("Operation cancelled"));
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = narrationSpeed;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          if (currentAudioSourceRef.current === source) {
            currentAudioSourceRef.current = null;
            if (operationIdRef.current === localOpId) {
                resolve();
            } else {
                reject(new Error("Operation cancelled during playback"));
            }
          }
        };

        source.start();
        currentAudioSourceRef.current = source;
      } catch (err) {
        console.error("Narration failed:", err);
        if (operationIdRef.current === localOpId) {
          onError(err as Error);
        }
        reject(err);
      }
    });
  }, [stopAllAudio, updateNarrationState, onError, narrationSpeed]);
  
  const processUserSpeech = useCallback(async (speech: string, localOpId: string) => {
    if (operationIdRef.current !== localOpId) return;
    updateNarrationState('PROCESSING');

    try {
        const result = await interpretUserChoice(speech, storyStep.choices, storyStep.story, language);
        if (operationIdRef.current !== localOpId) return;

        if (result !== 'UNCLEAR') {
            onChoiceSelected(result);
            // The flow will stop here as a new step will be generated.
        } else {
            if (retryCount < 2) {
                setRetryCount(prev => prev + 1);
                await narrateText(t('voiceChoiceUnclear') as string, localOpId);
                // The `await` is important here to ensure narration finishes before listening again.
                await startListeningForChoice(localOpId);
            } else {
                await narrateText(t('voiceChoiceRetryFail') as string, localOpId);
                updateNarrationState('IDLE');
            }
        }
    } catch (err) {
        console.error("Failed to interpret user choice:", err);
        if (operationIdRef.current === localOpId) onError(err as Error);
        updateNarrationState('IDLE');
    }
  }, [storyStep.choices, storyStep.story, language, retryCount, narrateText, onChoiceSelected, updateNarrationState, t, onError]);


  const startListeningForChoice = useCallback(async (localOpId: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        if (operationIdRef.current !== localOpId) return reject(new Error("Operation cancelled"));

        if (!SpeechRecognition) {
            onError(new Error("Speech Recognition not supported by this browser."));
            return reject(new Error("Speech Recognition not supported"));
        }
    
        cleanupSpeechRecognition();
        
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;

        let finalTranscript = '';
    
        const langMap = { en: 'en-US', es: 'es-ES', pt: 'pt-BR' };
        recognition.lang = langMap[language];
        recognition.continuous = true;
        recognition.interimResults = true;
    
        const stopListeningAndProcess = () => {
            if (!speechRecognitionRef.current) return;
            
            const speechToProcess = finalTranscript.trim().toLowerCase();
            cleanupSpeechRecognition();

            if (!speechToProcess) {
                // Fired on no-speech error or empty transcript
                processUserSpeech("", localOpId).then(resolve).catch(reject);
                return;
            }

            if (speechToProcess === (t('stopCommand') as string).toLowerCase()) {
                return resolve();
            }
            if (operationIdRef.current === localOpId) {
                processUserSpeech(speechToProcess, localOpId).then(resolve).catch(reject);
            }
        };

        recognition.onstart = () => {
            updateNarrationState('LISTENING');
        };
    
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (endOfSpeechTimeoutRef.current) {
                clearTimeout(endOfSpeechTimeoutRef.current);
            }

            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Wait for a pause of 1.2 seconds after the last word to finalize.
            endOfSpeechTimeoutRef.current = window.setTimeout(stopListeningAndProcess, 1200);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
             if (event.error !== 'aborted' && operationIdRef.current === localOpId) {
                stopListeningAndProcess(); // Treat errors like 'no-speech' as a chance to retry
            } else {
                reject(new Error(event.error));
            }
        };
    
        recognition.onend = () => {
             // onend can be called by .stop(), .abort(), or by the browser itself.
             // We only want to resolve here if it wasn't handled by a result or error already.
            if (speechRecognitionRef.current === recognition) {
                speechRecognitionRef.current = null;
                 if (narrationStateRef.current === 'LISTENING') {
                    updateNarrationState('IDLE');
                }
                resolve();
            }
        };
        
        recognition.start();
    });
  }, [updateNarrationState, cleanupSpeechRecognition, onError, language, t, processUserSpeech]);
  

  // Main effect to orchestrate the narration flow for a new story step.
  useEffect(() => {
    if (!storyStep || !isInitialized || storyStep.choiceMade) return;

    const opId = storyStep.id;
    operationIdRef.current = opId;
    setRetryCount(0);

    const runNarrationSequence = async () => {
        try {
            await narrateText(storyStep.story, opId);
            const promptText = `${t('voiceChoicePrompt')} ${storyStep.choices.join(', ')}`;
            await narrateText(promptText, opId);
            await startListeningForChoice(opId);
        } catch (error) {
            if ((error as Error).message.includes('Operation cancelled')) {
                // This is expected if the component unmounts or step changes.
                console.log("Narration sequence cancelled gracefully.");
            } else {
                // Actual error
                onError(error as Error);
            }
        }
    };
    
    runNarrationSequence();

    return () => {
      operationIdRef.current = null;
      stopAllAudio();
      cleanupSpeechRecognition();
      updateNarrationState('IDLE');
    };
  }, [storyStep, language, isInitialized]); // Rerun when the step or language changes

  // Effect to handle narrating a choice when clicked.
  useEffect(() => {
      if (clickedChoiceToNarrate && isInitialized) {
          const {id, choice} = clickedChoiceToNarrate;
          operationIdRef.current = id; // New operation, cancel previous
          
          stopAllAudio();
          cleanupSpeechRecognition();

          narrateText(choice, id).catch(err => {
              if (!(err as Error).message.includes('Operation cancelled')) {
                  onError(err);
              }
          });
      }
  }, [clickedChoiceToNarrate, isInitialized]);

  // Initialize and cleanup resources
  useEffect(() => {
    if (isInitialized) return;
    try {
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        setIsInitialized(true);
    } catch(e) {
        console.error("Failed to initialize audio systems", e);
        onError(e as Error);
    }
    
    return () => {
        audioContextRef.current?.close();
        cleanupSpeechRecognition();
        stopAllAudio();
    };
  }, []);

  return null; // This is a headless component
});

export default LiveNarrator;
