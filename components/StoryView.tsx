import React, { useRef, useEffect, useState } from 'react';
import { GameState, GameSession } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, MicrophoneIcon, SpeakerOnIcon, SparklesIcon } from './Icons';
import { NarrationState } from './LiveNarrator';


interface StoryViewProps {
  session: GameSession;
  currentIndex: number;
  onSelectChoice: (choice: string) => void;
  onPrev: () => void;
  onNext: () => void;
  gameState: GameState;
  narrationState: NarrationState;
  optimisticChoice: string | null;
  t: (key: string) => string | string[];
}

const NarrationStatusIndicator: React.FC<{ state: NarrationState, t: (key: string) => string | string[] }> = ({ state, t }) => {
  if (state === 'IDLE') return null;

  const statusConfig: Record<NarrationState, { icon: React.ReactNode; text: string }> = {
    IDLE: { icon: null, text: '' },
    NARRATING: { icon: <SpeakerOnIcon className="w-6 h-6 text-teal-300" />, text: t('narrating') as string },
    LISTENING: { icon: <MicrophoneIcon className="w-6 h-6 text-teal-300" />, text: t('listening') as string },
    PROCESSING: { icon: <SparklesIcon className="w-6 h-6 text-teal-300 animate-pulse" />, text: t('processing') as string },
  };

  const { icon, text } = statusConfig[state];

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-full max-w-xs mx-auto animate-fadeIn">
      <div className="bg-slate-900/80 backdrop-blur-sm border border-teal-500/50 rounded-lg p-3 flex items-center justify-center gap-4 shadow-lg">
        {icon}
        <div className="flex items-center gap-1.5 h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="waveform-bar w-1 h-full bg-teal-400 rounded-full"
              style={{ animationDelay: `${-1 + i * 0.2}s` }}
            ></div>
          ))}
        </div>
        <p className="text-teal-200 font-semibold w-28 text-center">{text}</p>
      </div>
    </div>
  );
};


const StoryView: React.FC<StoryViewProps> = ({ session, currentIndex, onSelectChoice, onPrev, onNext, gameState, narrationState, optimisticChoice, t }) => {
  const currentStep = session.history[currentIndex];
  const storyHistory = session.history;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const isLastStepInHistory = currentIndex === storyHistory.length - 1;

  useEffect(() => {
    if (gameState === 'LOADING') {
      const messages = t('inGameLoadingPrompts') as string[];
      setLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [gameState, t]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  if (!currentStep) return null;
  
  const handleChoiceClick = (choice: string) => {
    onSelectChoice(choice);
  };

  return (
    <main className="w-full md:w-2/3 lg:w-3/4 flex flex-col h-full animate-fadeIn">
      <div className="flex-grow rounded-lg border border-slate-700 overflow-hidden shadow-2xl grid">
        {/* All children are placed in the same grid cell (1,1) to create layers */}
        {/* Layer 1: Image */}
        <img
          key={currentStep.id}
          src={currentStep.imageUrl}
          alt="Story scene"
          className="col-start-1 row-start-1 w-full h-full object-cover rounded-lg"
        />
        
        {/* Layer 2: Gradient */}
        <div className="col-start-1 row-start-1 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent pointer-events-none"></div>

        {/* Layer 3: UI (Text and Buttons) */}
        <div className="col-start-1 row-start-1 relative flex flex-col justify-between">
          <div className="flex justify-end p-4">
            <div className="flex gap-2">
              <button onClick={onPrev} disabled={currentIndex === 0 || gameState === 'LOADING'} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <button onClick={onNext} disabled={isLastStepInHistory || gameState === 'LOADING'} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-6 w-full h-[35%] flex flex-col">
              <div 
                  ref={scrollRef}
                  className="bg-slate-900/70 backdrop-blur-[6px] rounded-lg p-4 border border-slate-700/50 overflow-y-auto custom-scrollbar shadow-2xl flex-grow"
              >
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-base md:text-lg">
                      {currentStep.story}
                  </p>
              </div>
          </div>
        </div>

        {/* Layer 4: Loading Overlay */}
        {gameState === 'LOADING' && (
          <div className="col-start-1 row-start-1 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-center items-center z-30 rounded-lg">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 pt-6 relative">
        <NarrationStatusIndicator state={narrationState} t={t} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentStep.choices.map((choice, index) => {
            const isOptimistic = optimisticChoice === choice;
            const hasBeenChosen = currentStep.choiceMade === choice || (isLastStepInHistory && isOptimistic);
            const isDisabled = gameState === 'LOADING' || narrationState !== 'IDLE';

            const baseClasses = 'text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75 shadow-lg';
            const chosenClasses = 'bg-gradient-to-br from-green-600 to-emerald-700 ring-2 ring-yellow-300 scale-100';
            const interactiveClasses = 'hover:scale-105 hover:from-teal-700 hover:to-cyan-800';
            const availableClasses = 'bg-gradient-to-br from-teal-600 to-cyan-700';
            const disabledUnselectedClasses = 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-400 cursor-not-allowed shadow-none scale-100';
            
            let finalClasses = baseClasses;

            if (hasBeenChosen) {
                finalClasses += ` ${chosenClasses}`;
            } else if (isDisabled) {
                finalClasses += ` ${disabledUnselectedClasses}`;
            } else { // Available and interactive
                finalClasses += ` ${availableClasses} ${interactiveClasses}`;
            }
            
            return (
              <button
                key={index}
                onClick={() => handleChoiceClick(choice)}
                disabled={isDisabled}
                className={finalClasses}
              >
                {choice}
              </button>
            )
          })}
        </div>
      </div>
    </main>
  );
};

export default StoryView;