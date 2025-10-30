

import React, { useEffect, useRef } from 'react';

const musicTracks = {
  default: 'https://cdn.pixabay.com/audio/2022/11/23/audio_752f613c71.mp3', // A neutral default
  calm: 'https://cdn.pixabay.com/audio/2022/10/18/audio_b25555d939.mp3',
  tense: 'https://cdn.pixabay.com/audio/2024/05/23/audio_7259173f4e.mp3',
  action: 'https://cdn.pixabay.com/audio/2024/04/23/audio_b798735237.mp3',
  mysterious: 'https://cdn.pixabay.com/audio/2022/08/04/audio_34b0a82ac3.mp3',
  uplifting: 'https://cdn.pixabay.com/audio/2022/02/11/audio_a0f37578a1.mp3',
  sad: 'https://cdn.pixabay.com/audio/2022/11/17/audio_88f6c449c2.mp3',
};

type Mood = keyof typeof musicTracks;

interface AudioManagerProps {
    mood?: string;
    volume: number;
    isMuted: boolean;
    hasInteracted: boolean;
}

const AudioManager: React.FC<AudioManagerProps> = ({ mood, volume, isMuted, hasInteracted }) => {
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'audio1' | 'audio2'>('audio1');
  const currentMoodRef = useRef<string | null>(null);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    audio1Ref.current = new Audio();
    audio2Ref.current = new Audio();

    // Set crossOrigin to "anonymous" to allow loading from the CDN. This is the fix.
    audio1Ref.current.crossOrigin = "anonymous";
    audio2Ref.current.crossOrigin = "anonymous";

    audio1Ref.current.loop = true;
    audio2Ref.current.loop = true;
    audio1Ref.current.volume = 0;
    audio2Ref.current.volume = 0;

    return () => {
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
      audio1Ref.current = null;
      audio2Ref.current = null;
    };
  }, []);

  const fade = (audio: HTMLAudioElement, targetVolume: number, duration: number, onComplete?: () => void) => {
    const startVolume = audio.volume;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const fraction = Math.min(progress / duration, 1);
      
      const newVolume = startVolume + (targetVolume - startVolume) * fraction;
      if (isFinite(newVolume)) {
          audio.volume = newVolume;
      }

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(step);
  };
  
  useEffect(() => {
    // Guard against running audio logic until user interaction and mood is set.
    if (!hasInteracted || !mood) return;

    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1 || !audio2) return;

    // Normalize mood and check if a change is even needed.
    const normalizedMood = (mood.toLowerCase() in musicTracks ? mood.toLowerCase() : 'default') as Mood;
    if (currentMoodRef.current === normalizedMood) return;
    currentMoodRef.current = normalizedMood;

    const newSrc = musicTracks[normalizedMood];

    const audioIn = activeAudioRef.current === 'audio1' ? audio2 : audio1;
    const audioOut = activeAudioRef.current === 'audio1' ? audio1 : audio2;

    // Switch active audio ref for the *next* transition.
    activeAudioRef.current = activeAudioRef.current === 'audio1' ? 'audio2' : 'audio1';
    
    // Action to perform once the new track is ready to be played.
    const onCanPlay = () => {
      const playPromise = audioIn.play();
      if (playPromise) {
          playPromise.catch(error => {
              console.error(`Audio play failed for track ${audioIn.src}:`, error);
          });
      }
      // Fade in the new track.
      fade(audioIn, isMutedRef.current ? 0 : volumeRef.current, 2000);
    };

    // Action to perform if loading the new track fails.
    const onError = (e: Event) => {
        const audioEl = e.target as HTMLAudioElement;
        console.error(`Error loading audio source: ${newSrc}`, audioEl.error);
    };

    // Start fading out the old track immediately.
    fade(audioOut, 0, 2000, () => {
      if (audioOut.src) {
        audioOut.pause();
      }
    });

    // Add event listeners to the incoming audio element.
    audioIn.addEventListener('canplay', onCanPlay, { once: true });
    audioIn.addEventListener('error', onError, { once: true });

    // If the source is different, set it, which will trigger loading.
    if (audioIn.src !== newSrc) {
        audioIn.src = newSrc;
    } else {
        // If source is the same, it might already be loaded.
        // readyState >= 3 means it's ready to play ('canplay' has fired or would fire).
        if (audioIn.readyState >= 3) {
            // Manually trigger the play action and remove the now-unneeded listeners.
            audioIn.removeEventListener('canplay', onCanPlay);
            audioIn.removeEventListener('error', onError);
            onCanPlay();
        }
        // If readyState < 3, the 'canplay' event will fire when it's ready.
    }
    
    // The effect's cleanup function ensures we don't have dangling listeners
    // if the mood changes again before 'canplay' or 'error' fires.
    return () => {
        audioIn.removeEventListener('canplay', onCanPlay);
        audioIn.removeEventListener('error', onError);
    };

  }, [mood, hasInteracted]);


  // Handles smooth volume changes from the slider/mute button.
  useEffect(() => {
    const audio = activeAudioRef.current === 'audio1' ? audio1Ref.current : audio2Ref.current;
    if (audio && !audio.paused && hasInteracted) {
        const targetVolume = isMuted ? 0 : volume;
        fade(audio, targetVolume, 500);
    }
  }, [volume, isMuted, hasInteracted]);

  return null;
};

export default AudioManager;