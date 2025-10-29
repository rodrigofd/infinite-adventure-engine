import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import StoryView from './components/StoryView';
import { GameState, StoryStep, GameSession } from './types';
import { generateAdventureStart, generateNextStep, generateRandomPrompt } from './services/geminiService';
import { BookOpenIcon, WandIcon, TrashIcon, SparklesIcon, HomeIcon, PlayIcon, SpeakerOnIcon, SpeakerOffIcon } from './components/Icons';
import LoadingSpinner from './components/LoadingSpinner';
import { translations } from './lib/translations';
import LanguageSelector from './components/LanguageSelector';
import Tooltip, { TooltipData } from './components/Tooltip';

const SESSIONS_KEY = 'infinite-adventure-sessions';

// Let TypeScript know about the global localforage object from the CDN script
declare const localforage: any;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SESSION_SELECT');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('es');
  const [error, setError] = useState<string | null>(null);
  const [playerInput, setPlayerInput] = useState<string>('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(false);
  const [isPromptAiGenerated, setIsPromptAiGenerated] = useState(false);
  const [initialLoadingMessage, setInitialLoadingMessage] = useState('');


  const [showBranchConfirm, setShowBranchConfirm] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [tooltipData, setTooltipData] = useState<TooltipData>({ visible: false, content: { text: '' }, x: 0, y: 0 });
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);

  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  }, [language]);

  // Load sessions from localForage on initial render
  useEffect(() => {
    const loadSessions = async () => {
      try {
        if (typeof localforage !== 'undefined') {
          const savedSessions = await localforage.getItem(SESSIONS_KEY);
          if (savedSessions && Array.isArray(savedSessions)) {
            setSessions(savedSessions);
          }
        }
      } catch (e) {
        console.error("Failed to load sessions from localForage", e);
      }
    };
    loadSessions();
  }, []);

  // Set a random loading message when starting a new game
  useEffect(() => {
    if (gameState === 'LOADING' && !activeSession) {
      const messages = t('initialLoadingPrompts') as unknown as string[];
      setInitialLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [gameState, activeSession, t]);

  // Auto-save active session whenever it changes
  useEffect(() => {
    if (activeSession) {
      setSessions(prevSessions => {
        const sessionExists = prevSessions.some(s => s.id === activeSession.id);
        let updatedSessions;

        if (sessionExists) {
          updatedSessions = prevSessions.map(s => s.id === activeSession.id ? activeSession : s);
        } else {
          updatedSessions = [activeSession, ...prevSessions];
        }

        if (typeof localforage !== 'undefined') {
          localforage.setItem(SESSIONS_KEY, updatedSessions).catch((err: any) => {
            console.error("Failed to save session", err);
          });
        }
        
        return updatedSessions;
      });
    }
  }, [activeSession]);


  // Auto-focus prompt input after AI generation
  useEffect(() => {
    if (isPromptAiGenerated && promptTextareaRef.current) {
      promptTextareaRef.current.focus();
      const len = promptTextareaRef.current.value.length;
      promptTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isPromptAiGenerated, playerInput]);


  const handleGenerateIdea = useCallback(async () => {
    setIsGeneratingIdea(true);
    setError(null);
    try {
        const promptToUse = isPromptAiGenerated ? '' : playerInput;
        const generatedPrompt = await generateRandomPrompt(promptToUse, language);
        setPlayerInput(generatedPrompt);
        setIsPromptAiGenerated(true); 
    } catch (e) {
        console.error("Failed to generate prompt idea", e);
        setError(t('errorTangled'));
    } finally {
        setIsGeneratingIdea(false);
    }
  }, [playerInput, language, t, isPromptAiGenerated]);

  const handleStartNewGame = useCallback(async () => {
    if (!playerInput.trim()) {
      setError(t('describePrompt'));
      return;
    }
    setGameState('LOADING');
    setError(null);
    try {
      const { scene, imageUrl, bannerUrl } = await generateAdventureStart(playerInput, language);
      const firstStep: StoryStep = {
        id: crypto.randomUUID(),
        imageUrl,
        story: scene.story,
        choices: scene.choices,
        inventory: scene.inventory,
        currentQuest: scene.currentQuest,
      };
      const newSession: GameSession = {
        id: crypto.randomUUID(),
        title: scene.title,
        prompt: playerInput,
        bannerUrl,
        language,
        createdAt: Date.now(),
        history: [firstStep],
      };
      setActiveSession(newSession);
      setCurrentStepIndex(0);
      setGameState('PLAYING');
      setPlayerInput('');
      setIsPromptAiGenerated(false);
    } catch (e) {
      console.error(e);
      setError(t('errorStart'));
      setGameState('SESSION_SELECT');
    }
  }, [playerInput, language, t]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBranchConfirm(null);
        setSessionToDelete(null);
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.activeElement === promptTextareaRef.current) {
        e.preventDefault();
        handleStartNewGame();
      }
      if (e.key === 'F1' && gameState === 'SESSION_SELECT') {
        e.preventDefault();
        handleGenerateIdea();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleStartNewGame, handleGenerateIdea]);


  const processChoice = useCallback(async (choice: string, historySlice: StoryStep[]) => {
    setGameState('LOADING');
    setError(null);

    const updatedHistorySlice = [...historySlice];
    const lastStepIndex = updatedHistorySlice.length - 1;
    
    updatedHistorySlice[lastStepIndex] = {
        ...updatedHistorySlice[lastStepIndex],
        choiceMade: choice
    };

    try {
        const { scene, imageUrl } = await generateNextStep(updatedHistorySlice, choice, language);
        const newStep: StoryStep = { 
            id: crypto.randomUUID(), 
            imageUrl, 
            story: scene.story,
            choices: scene.choices,
            inventory: scene.inventory,
            currentQuest: scene.currentQuest
        };
        
        const newHistory = [...updatedHistorySlice, newStep];
        
        if (activeSession) {
            setActiveSession({ ...activeSession, history: newHistory });
            setCurrentStepIndex(newHistory.length - 1);
        }
        setGameState('PLAYING');
    } catch (e) {
        console.error(e);
        setError(t('errorTangled'));
        setGameState('PLAYING');
    } finally {
        setShowBranchConfirm(null);
    }
  }, [activeSession, language, t]);

  const handleSelectChoice = useCallback((choice: string) => {
    if (!activeSession) return;

    const currentStep = activeSession.history[currentStepIndex];
    const isBranching = currentStep.choiceMade && currentStep.choiceMade !== choice;
    
    if (isBranching) {
        setShowBranchConfirm(choice);
    } else {
        const historySlice = activeSession.history.slice(0, currentStepIndex + 1);
        processChoice(choice, historySlice);
    }
  }, [activeSession, currentStepIndex, processChoice]);
  
  const confirmBranching = () => {
    if (showBranchConfirm && activeSession) {
      const historySlice = activeSession.history.slice(0, currentStepIndex + 1);
      processChoice(showBranchConfirm, historySlice);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    const sessionToResume = sessions.find(s => s.id === sessionId);
    if (sessionToResume) {
      setLanguage(sessionToResume.language);
      setActiveSession(sessionToResume);
      setCurrentStepIndex(sessionToResume.history.length - 1);
      setGameState('PLAYING');
    }
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete) {
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.filter(s => s.id !== sessionToDelete);
        if (typeof localforage !== 'undefined') {
          localforage.setItem(SESSIONS_KEY, updatedSessions).catch((err: any) => {
            console.error("Failed to save after deletion", err);
          });
        }
        return updatedSessions;
      });
      setSessionToDelete(null);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent, content: string) => {
    setTooltipData({ visible: true, content: { text: content }, x: e.clientX, y: e.clientY });
  };
  const handleMouseLeave = () => {
    setTooltipData(prev => ({ ...prev, visible: false }));
  };
  
  const handleTooltipWheelScroll = (e: React.WheelEvent) => {
    if (tooltipContentRef.current) {
      // Unconditionally prevent the default browser action (scrolling the page)
      // and stop the event from bubbling up to parent elements.
      // This ensures that as long as the tooltip is visible, mouse scrolling
      // will not affect the underlying page, solving the "pass-through" issue.
      e.preventDefault();
      e.stopPropagation();

      // Manually adjust the scrollTop of the tooltip's content.
      // The browser will automatically clamp the value so it doesn't go below 0 or above the maximum scroll height.
      tooltipContentRef.current.scrollTop += e.deltaY;
    }
  };


  const renderSessionSelect = () => (
    <div className="w-full max-w-4xl mx-auto text-center animate-fadeIn p-4">
        <div className="bg-slate-800/50 p-6 md:p-8 rounded-xl shadow-2xl border border-slate-700 backdrop-blur-sm relative">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSelector language={language} setLanguage={setLanguage} />
            </div>
            <BookOpenIcon className="w-20 h-20 mx-auto text-amber-400 mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{t('title')}</h1>
            
            {sessions.length > 0 && (
                <div className="my-8">
                    <h2 className="text-2xl font-bold text-teal-300 mb-4">{t('sessions')}</h2>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                        {sessions.sort((a,b) => b.createdAt - a.createdAt).map(session => (
                            <div 
                                key={session.id} 
                                className="bg-slate-900/70 rounded-lg flex items-center transition-all duration-300 border-2 border-transparent hover:border-amber-400 hover:bg-slate-800/80 group cursor-pointer"
                                onMouseMove={(e) => handleMouseMove(e, session.prompt)}
                                onMouseLeave={handleMouseLeave}
                                onWheel={handleTooltipWheelScroll}
                                onClick={() => handleResumeSession(session.id)}
                            >
                                <img src={session.bannerUrl} alt="Adventure banner" className="w-24 h-24 object-cover rounded-l-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0 p-3 text-left">
                                    <p className="font-semibold text-lg text-white truncate">{session.title}</p>
                                    <p className="text-sm text-slate-400 truncate">{session.prompt}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(session.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 p-3 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleResumeSession(session.id)} title={t('resume')} className="p-2 bg-green-600/80 rounded-lg hover:bg-green-600 transition-all group-hover:scale-110"><PlayIcon className="w-6 h-6"/></button>
                                    <button onClick={() => setSessionToDelete(session.id)} title={t('delete')} className="p-2 bg-red-600/80 rounded-lg hover:bg-red-600 transition-all group-hover:scale-110"><TrashIcon className="w-6 h-6"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <h2 className="text-2xl font-bold text-teal-300 mb-4 mt-8">{t('startNew')}</h2>
            <p className="text-lg text-slate-300 mb-6">{t('description')}</p>
            <div className="relative w-full">
                <textarea
                    ref={promptTextareaRef}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pr-14 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition duration-200 h-28 resize-none"
                    placeholder={t('placeholder')}
                    value={playerInput}
                    onChange={(e) => {
                      setPlayerInput(e.target.value);
                      setIsPromptAiGenerated(false); // User has edited the prompt
                    }}
                    disabled={isGeneratingIdea || gameState === 'LOADING'}
                />
                <button
                    onClick={handleGenerateIdea}
                    disabled={isGeneratingIdea || gameState === 'LOADING'}
                    title={t('generatePromptIdea')}
                    className="absolute top-3 right-3 p-2 rounded-full bg-teal-600/50 text-teal-300 hover:bg-teal-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-9 w-9"
                >
                    {isGeneratingIdea ? <LoadingSpinner size="small" /> : <SparklesIcon className="w-5 h-5" />}
                </button>
            </div>
             <div className="flex items-center justify-center gap-4 mt-6">
                <label className="flex items-center cursor-pointer">
                    <span className="mr-3 text-slate-300">{t('narrate')}</span>
                    <div className="relative">
                        <input type="checkbox" checked={isNarrationEnabled} onChange={() => setIsNarrationEnabled(!isNarrationEnabled)} className="sr-only" />
                        <div className={`block w-14 h-8 rounded-full transition-colors ${isNarrationEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isNarrationEnabled ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                </label>
            </div>
            <button
                onClick={handleStartNewGame}
                disabled={gameState === 'LOADING' || isGeneratingIdea}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 font-bold py-3 px-4 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            >
              <WandIcon className="w-6 h-6" /> {t('beginAdventure')}
            </button>
            {error && <p className="text-red-400 mt-4">{error}</p>}
            <Tooltip data={tooltipData} ref={tooltipContentRef} />
        </div>
    </div>
  );
  
  const renderGame = () => {
    if (!activeSession) return null;
    const currentStep = activeSession.history[currentStepIndex];

    return (
        <div className="flex flex-col w-full h-full max-w-7xl mx-auto">
            <header className="w-full flex justify-between items-center mb-4 flex-shrink-0 animate-fadeIn p-2 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700">
                <button onClick={() => { setActiveSession(null); setGameState('SESSION_SELECT'); }} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors" title={t('home')}>
                    <HomeIcon className="w-5 h-5 text-amber-400"/>
                    <span className="hidden md:inline font-semibold">{t('home')}</span>
                </button>
                <h1 className="text-xl font-bold text-amber-300 mx-4 text-center flex-grow hidden sm:block truncate" style={{textShadow: '1px 1px 2px #000'}}>
                    {t('title')}
                </h1>
                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={() => setIsNarrationEnabled(!isNarrationEnabled)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${isNarrationEnabled ? 'bg-teal-600 border-teal-500 text-white shadow-md' : 'bg-slate-700/80 border-slate-600 text-slate-300'} hover:border-amber-400 hover:text-white`} 
                        title={t('narrate')}
                    >
                         { isNarrationEnabled ? <SpeakerOnIcon className="w-5 h-5" /> : <SpeakerOffIcon className="w-5 h-5" />}
                        <span className="hidden lg:inline font-semibold">{t('narrate')}</span>
                    </button>
                    <LanguageSelector language={language} setLanguage={setLanguage} />
                </div>
            </header>
            
            <div className="relative w-full h-24 md:h-32 rounded-lg overflow-hidden mb-6 border-2 border-amber-500/50 shadow-lg animate-fadeIn">
                <img src={activeSession.bannerUrl} alt="Adventure Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <h1 className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-xl md:text-3xl font-bold text-white text-center truncate" style={{textShadow: '2px 2px 4px #000'}} title={activeSession.title}>
                    {activeSession.title}
                </h1>
            </div>

            <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0">
                <Sidebar 
                    inventory={currentStep.inventory} 
                    currentQuest={currentStep.currentQuest} 
                    translations={{ 
                        inventory: t('inventory'), 
                        currentQuest: t('currentQuest'), 
                        emptyInventory: t('emptyInventory'), 
                        noQuest: t('noQuest'),
                        storyTimeline: t('storyTimeline')
                    }}
                    sessionHistory={activeSession.history}
                    currentIndex={currentStepIndex}
                    onStepSelect={setCurrentStepIndex}
                />
                <StoryView
                session={activeSession}
                currentIndex={currentStepIndex}
                onSelectChoice={handleSelectChoice}
                onPrev={() => setCurrentStepIndex(i => Math.max(0, i-1))}
                onNext={() => setCurrentStepIndex(i => Math.min(activeSession.history.length - 1, i+1))}
                gameState={gameState}
                t={t}
                />
            </div>
             {error && <div className="fixed bottom-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg animate-fadeIn">{error}</div>}
        </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 p-4 md:p-6 flex flex-col items-center justify-center font-sans">
      
      {gameState === 'LOADING' && !activeSession && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col justify-center items-center z-[10000]">
            <LoadingSpinner />
            <p className="mt-4 text-xl text-amber-300">{initialLoadingMessage}</p>
        </div>
      )}

      <div className="w-full h-full flex-grow flex items-center justify-center max-w-7xl mx-auto">
        {gameState === 'SESSION_SELECT' || !activeSession ? renderSessionSelect() : renderGame()}
      </div>

      {showBranchConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-slate-800 border border-amber-500 rounded-lg shadow-xl p-6 max-w-sm text-center">
            <h3 className="text-xl font-bold text-white mb-2">{t('branchConfirmTitle')}</h3>
            <p className="text-slate-300 mb-6">{t('branchConfirmMessage')}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowBranchConfirm(null)} className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors">{t('cancel')}</button>
              <button onClick={confirmBranching} className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-semibold">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {sessionToDelete && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-slate-800 border border-red-500 rounded-lg shadow-xl p-6 max-w-sm text-center">
            <h3 className="text-xl font-bold text-white mb-2">{t('deleteConfirmTitle')}</h3>
            <p className="text-slate-300 mb-6">{t('deleteConfirm')}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setSessionToDelete(null)} className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors">{t('cancel')}</button>
              <button onClick={confirmDeleteSession} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;