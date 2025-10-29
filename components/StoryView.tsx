import React, { useRef, useEffect, useState } from 'react';
import { GameState, GameSession } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface StoryViewProps {
  session: GameSession;
  currentIndex: number;
  onSelectChoice: (choice: string) => void;
  onPrev: () => void;
  onNext: () => void;
  gameState: GameState;
  t: (key: string) => string | string[];
}

const StoryView: React.FC<StoryViewProps> = ({ session, currentIndex, onSelectChoice, onPrev, onNext, gameState, t }) => {
  const currentStep = session.history[currentIndex];
  const storyHistory = session.history;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [optimisticChoice, setOptimisticChoice] = useState<string | null>(null);
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
    // Reset optimistic choice when the step actually changes
    if (isLastStepInHistory) {
        setOptimisticChoice(null);
    }
  }, [currentIndex, isLastStepInHistory]);

  if (!currentStep) return null;
  
  const handleChoiceClick = (choice: string) => {
    // Only set optimistic choice for immediate feedback on the latest step
    if (isLastStepInHistory) {
      setOptimisticChoice(choice);
    }
    onSelectChoice(choice);
  };

  return (
    <main className="w-full md:w-2/3 lg:w-3/4 flex flex-col h-full animate-fadeIn">
      <div className="flex-grow bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden p-4 md:p-6 shadow-2xl relative flex flex-col">
        {gameState === 'LOADING' && (
          <div className="absolute inset-0 bg-slate-900/80 flex flex-col justify-center items-center z-20 rounded-lg">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
          </div>
        )}
        <div className="flex-shrink-0 relative">
          <img
            key={currentStep.id}
            src={currentStep.imageUrl}
            alt="Story scene"
            className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-lg shadow-lg border-2 border-slate-600"
          />
           <div className="absolute bottom-2 right-2 flex gap-2">
            <button onClick={onPrev} disabled={currentIndex === 0 || gameState === 'LOADING'} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button onClick={onNext} disabled={isLastStepInHistory || gameState === 'LOADING'} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2 mt-6 custom-scrollbar">
             <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {currentStep.story}
            </p>
        </div>
      </div>
      <div className="flex-shrink-0 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentStep.choices.map((choice, index) => {
            const isOptimistic = optimisticChoice === choice;
            const hasBeenChosen = currentStep.choiceMade === choice || (isLastStepInHistory && isOptimistic);
            const isDisabled = gameState === 'LOADING';

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