import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Sidebar from './components/Sidebar';
import StoryView from './components/StoryView';
import { GameState, StoryStep, GameSession, NarrationRef } from './types';
import { generateAdventureStart, generateNextStep, generateRandomPrompt, generateRandomVisualStylePrompt } from './services/geminiService';
import { WandIcon, TrashIcon, SparklesIcon, HomeIcon, PlayIcon, SpeakerOnIcon, SpeakerOffIcon, PaintBrushIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, MicrophoneIcon } from './components/Icons';
import LoadingSpinner from './components/LoadingSpinner';
import { translations } from './lib/translations';
import LanguageSelector from './components/LanguageSelector';
import Tooltip, { TooltipData } from './components/Tooltip';
import LiveNarrator, { NarrationState } from './components/LiveNarrator';

const SESSIONS_KEY = 'infinite-adventure-sessions';
const NARRATION_ENABLED_KEY = 'sagaforge-narration-enabled';
const NARRATION_SPEED_KEY = 'sagaforge-narration-speed';
const NARRATION_SPEEDS = [1, 1.25, 1.5];

// Let TypeScript know about the global localforage object from the CDN script
declare const localforage: any;

const predefinedStyles = [
  { id: 'fantasy', name: 'Fantasy Art', prompt: 'Vibrant, detailed digital painting, high fantasy theme, dramatic lighting, epic.', imageUrl: '/assets/style-fantasy-art.png' },
  { id: 'sci-fi', name: 'Sci-Fi Comic', prompt: 'Retro sci-fi comic book art, bold lines, halftone dots, vibrant pulp aesthetic.', imageUrl: '/assets/style-sci-fi.png' },
  { id: 'anime', name: 'Anime', prompt: 'Lush, hand-painted anime style reminiscent of Studio Ghibli, whimsical, soft colors, detailed backgrounds.', imageUrl: '/assets/style-anime.png' },
  { id: 'pixel', name: 'Pixel Art', prompt: 'Crisp 16-bit pixel art, detailed sprites and environments, limited color palette, retro gaming aesthetic.', imageUrl: '/assets/style-pixel-art.png' },
];
const DEFAULT_STYLE_ID = 'fantasy';


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SESSION_SELECT');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('es');
  const [error, setError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  
  // Main prompt state
  const [playerInput, setPlayerInput] = useState<string>('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isPromptAiGenerated, setIsPromptAiGenerated] = useState(false);
  
  // Visual style prompt state
  const [visualStyleSelection, setVisualStyleSelection] = useState<string>(DEFAULT_STYLE_ID);
  const [customVisualStyle, setCustomVisualStyle] = useState<string>('');
  const [isGeneratingStyleIdea, setIsGeneratingStyleIdea] = useState(false);
  const [isCustomStyleAiGenerated, setIsCustomStyleAiGenerated] = useState(false);

  // Narration State
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(false);
  const [narrationSpeed, setNarrationSpeed] = useState(1);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [narrationState, setNarrationState] = useState<NarrationState>('IDLE');
  const [clickedChoiceToNarrate, setClickedChoiceToNarrate] = useState<{ id: string; choice: string } | null>(null);
  const [initialLoadingMessage, setInitialLoadingMessage] = useState('');
  const [optimisticChoice, setOptimisticChoice] = useState<string | null>(null);

  const narratorRef = useRef<NarrationRef>(null);
  const portalRoot = document.getElementById('portals');


  const [showBranchConfirm, setShowBranchConfirm] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [tooltipData, setTooltipData] = useState<TooltipData>({ visible: false, content: { text: '' }, x: 0, y: 0 });
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const customStyleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);

  const t = useCallback((key: keyof typeof translations.en): string | string[] => {
    const translation = translations[language][key] || translations.en[key];
    return translation;
  }, [language]);
  

  // Load settings and sessions from localForage on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        if (typeof localforage !== 'undefined') {
          const [savedSessions, savedNarration, savedSpeed] = await Promise.all([
            localforage.getItem(SESSIONS_KEY),
            localforage.getItem(NARRATION_ENABLED_KEY),
            localforage.getItem(NARRATION_SPEED_KEY)
          ]);

          if (savedSessions && Array.isArray(savedSessions)) {
            setSessions(savedSessions);
          }
          if (savedNarration !== null) {
            setIsNarrationEnabled(savedNarration as boolean);
          }
          if (savedSpeed !== null && NARRATION_SPEEDS.includes(savedSpeed as number)) {
            setNarrationSpeed(savedSpeed as number);
          }
        }
      } catch (e) {
        console.error("Failed to load data from localForage", e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save narration settings to localforage
  useEffect(() => {
    if (settingsLoaded) {
      if (typeof localforage !== 'undefined') {
        localforage.setItem(NARRATION_ENABLED_KEY, isNarrationEnabled).catch((err: any) => {
          console.error("Failed to save narration setting", err);
        });
        localforage.setItem(NARRATION_SPEED_KEY, narrationSpeed).catch((err: any) => {
          console.error("Failed to save narration speed", err);
        });
      }
    }
  }, [isNarrationEnabled, narrationSpeed, settingsLoaded]);

  // Clear error/success messages after a delay
  useEffect(() => {
    if (error) {
        const timer = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (importSuccessMessage) {
        const timer = setTimeout(() => setImportSuccessMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [importSuccessMessage]);

  // Set a random loading message when starting a new game
  useEffect(() => {
    if (gameState === 'LOADING' && !activeSession) {
      const messages = t('initialLoadingPrompts') as string[];
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
  
  useEffect(() => {
    if (isCustomStyleAiGenerated && customStyleTextareaRef.current) {
      customStyleTextareaRef.current.focus();
      const len = customStyleTextareaRef.current.value.length;
      customStyleTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isCustomStyleAiGenerated, customVisualStyle]);


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
        setError(t('errorTangled') as string);
    } finally {
        setIsGeneratingIdea(false);
    }
  }, [playerInput, language, t, isPromptAiGenerated]);

  const handleGenerateStyleIdea = useCallback(async () => {
    setIsGeneratingStyleIdea(true);
    setError(null);
    try {
        const promptToUse = isCustomStyleAiGenerated ? '' : customVisualStyle;
        const generatedPrompt = await generateRandomVisualStylePrompt(promptToUse, language);
        setCustomVisualStyle(generatedPrompt);
        setIsCustomStyleAiGenerated(true); 
    } catch (e) {
        console.error("Failed to generate style idea", e);
        setError(t('errorTangled') as string);
    } finally {
        setIsGeneratingStyleIdea(false);
    }
  }, [customVisualStyle, language, t, isCustomStyleAiGenerated]);

  const handleStartNewGame = useCallback(async () => {
    if (!playerInput.trim()) {
      setError(t('describePrompt') as string);
      return;
    }
    setGameState('LOADING');
    setError(null);

    let finalVisualStyle = '';
    if (visualStyleSelection === 'custom') {
      finalVisualStyle = customVisualStyle.trim() || predefinedStyles.find(s => s.id === DEFAULT_STYLE_ID)!.prompt;
    } else {
      finalVisualStyle = predefinedStyles.find(s => s.id === visualStyleSelection)!.prompt;
    }


    try {
      const { scene, imageUrl, bannerUrl } = await generateAdventureStart(playerInput, language, finalVisualStyle);
      const firstStep: StoryStep = {
        id: crypto.randomUUID(),
        imageUrl,
        story: scene.story,
        choices: scene.choices,
        inventory: scene.inventory,
        currentQuest: scene.currentQuest,
        mood: scene.mood,
      };
      const newSession: GameSession = {
        id: crypto.randomUUID(),
        title: scene.title,
        prompt: playerInput,
        visualStyle: finalVisualStyle,
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
      setError(t('errorStart') as string);
      setGameState('SESSION_SELECT');
    }
  }, [playerInput, language, t, visualStyleSelection, customVisualStyle]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBranchConfirm(null);
        setSessionToDelete(null);
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (document.activeElement === promptTextareaRef.current || document.activeElement === customStyleTextareaRef.current) {
            e.preventDefault();
            handleStartNewGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleStartNewGame, handleGenerateIdea]);


  const processChoice = useCallback(async (choice: string, historySlice: StoryStep[]) => {
    if (!activeSession) return;
    setGameState('LOADING');
    setError(null);

    const updatedHistorySlice = [...historySlice];
    const lastStepIndex = updatedHistorySlice.length - 1;
    
    updatedHistorySlice[lastStepIndex] = {
        ...updatedHistorySlice[lastStepIndex],
        choiceMade: choice
    };

    try {
        const { scene, imageUrl } = await generateNextStep(updatedHistorySlice, choice, language, activeSession.visualStyle);
        const newStep: StoryStep = { 
            id: crypto.randomUUID(), 
            imageUrl, 
            story: scene.story,
            choices: scene.choices,
            inventory: scene.inventory,
            currentQuest: scene.currentQuest,
            mood: scene.mood,
        };
        
        const newHistory = [...updatedHistorySlice, newStep];
        
        setActiveSession({ ...activeSession, history: newHistory });
        setCurrentStepIndex(newHistory.length - 1);
        setGameState('PLAYING');
    } catch (e) {
        console.error(e);
        setError(t('errorTangled') as string);
        setGameState('PLAYING');
    } finally {
        setShowBranchConfirm(null);
        setOptimisticChoice(null);
    }
  }, [activeSession, language, t]);

  const handleSelectChoice = useCallback((choice: string, source: 'click' | 'voice' = 'click') => {
    if (!activeSession || gameState === 'LOADING' || narrationState !== 'IDLE') return;

    if (currentStepIndex === activeSession.history.length - 1) {
        setOptimisticChoice(choice);
    }

    if (source === 'click' && isNarrationEnabled) {
      setClickedChoiceToNarrate({ id: crypto.randomUUID(), choice });
    }

    const currentStep = activeSession.history[currentStepIndex];
    const isBranching = currentStep.choiceMade && currentStep.choiceMade !== choice;
    
    if (isBranching) {
        setShowBranchConfirm(choice);
    } else {
        const historySlice = activeSession.history.slice(0, currentStepIndex + 1);
        processChoice(choice, historySlice);
    }
  }, [activeSession, currentStepIndex, processChoice, isNarrationEnabled, gameState, narrationState]);
  
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
    if (tooltipData.visible && tooltipContentRef.current) {
      // Prevent the default page scroll unconditionally when the tooltip is active.
      e.preventDefault();
      e.stopPropagation();

      // Apply the scroll to the tooltip content.
      // The browser will handle not scrolling past the boundaries.
      // The preventDefault() call above will stop the event from bubbling up.
      tooltipContentRef.current.scrollTop += e.deltaY;
    }
  };

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const handleExportSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const filename = `${sanitizeFilename(session.title)}.json`;
    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllSessions = () => {
    if (sessions.length === 0) return;
    
    const filename = 'sagaforge_adventures_backup.json';
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File content is not text.");
        }
        const data = JSON.parse(text);

        const sessionsToImport: GameSession[] = Array.isArray(data) ? data : [data];

        const areSessionsValid = sessionsToImport.every(
          s => s && typeof s === 'object' && s.id && s.title && Array.isArray(s.history)
        );

        if (!areSessionsValid) {
          throw new Error("Invalid session format.");
        }

        setSessions(prevSessions => {
          const sessionsMap = new Map(prevSessions.map(s => [s.id, s]));
          sessionsToImport.forEach(session => {
            sessionsMap.set(session.id, session);
          });
          const newSessions = Array.from(sessionsMap.values());
          localforage.setItem(SESSIONS_KEY, newSessions);
          return newSessions;
        });
        
        const successString = t('importSuccess') as string;
        setImportSuccessMessage(successString.replace('{count}', sessionsToImport.length.toString()));

      } catch (err) {
        console.error("Import failed:", err);
        setError(t('importError') as string);
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      setError(t('importError') as string);
      if (event.target) {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const handleCycleNarrationSpeed = () => {
    const currentIndex = NARRATION_SPEEDS.indexOf(narrationSpeed);
    const nextIndex = (currentIndex + 1) % NARRATION_SPEEDS.length;
    setNarrationSpeed(NARRATION_SPEEDS[nextIndex]);
  };

  const renderSessionSelect = () => {
    const styleOptions = [
      ...predefinedStyles,
      { id: 'custom', name: 'Custom', imageUrl: './assets/style-custom.png' }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto text-center animate-fadeIn p-4">
            <div className="bg-slate-800/50 p-6 md:p-8 rounded-xl shadow-2xl border border-slate-700 backdrop-blur-sm relative">
                <div className="absolute top-4 right-4 z-10">
                    <LanguageSelector language={language} setLanguage={setLanguage} />
                </div>
                <img src="./assets/adventure-gen-logo.png" alt="SagaForge Logo" className="w-48 mx-auto mb-2" />
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{t('title')}</h1>
                
                <div className="my-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-teal-300">{t('sessions')}</h2>
                      <div className="flex gap-2">
                        <label htmlFor="import-file-input" className="flex items-center gap-2 bg-slate-700/80 border border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-sm font-semibold">
                          <ArrowUpTrayIcon className="w-5 h-5"/> {t('importAdventures')}
                        </label>
                        <input id="import-file-input" type="file" className="hidden" onChange={handleFileImport} accept=".json"/>
                        {sessions.length > 0 && (
                          <button onClick={handleExportAllSessions} className="flex items-center gap-2 bg-slate-700/80 border border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                            <ArrowDownTrayIcon className="w-5 h-5"/> {t('exportAll')}
                          </button>
                        )}
                      </div>
                    </div>
                    {sessions.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                          {sessions.sort((a,b) => b.createdAt - a.createdAt).map(session => (
                              <div 
                                  key={session.id} 
                                  className="bg-slate-900/70 rounded-lg flex items-center transition-all duration-300 border-2 border-transparent hover:border-amber-400 hover:bg-slate-800/80 group"
                              >
                                  <div 
                                    className="flex-1 min-w-0 flex items-center cursor-pointer"
                                    onMouseMove={(e) => handleMouseMove(e, session.prompt)}
                                    onMouseLeave={handleMouseLeave}
                                    onWheel={handleTooltipWheelScroll}
                                    onClick={() => handleResumeSession(session.id)}
                                  >
                                    <img src={session.bannerUrl} alt="Adventure banner" className="w-24 h-24 object-cover rounded-l-lg flex-shrink-0" />
                                    <div className="flex-1 min-w-0 p-3 text-left">
                                        <p className="font-semibold text-lg text-white truncate">{session.title}</p>
                                        <p className="text-sm text-slate-400 truncate">{session.prompt}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <PaintBrushIcon className="w-3 h-3 text-teal-400 flex-shrink-0" />
                                            <p className="text-xs text-teal-500 truncate">{session.visualStyle}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{new Date(session.createdAt).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0 p-3 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                      <button onClick={() => handleResumeSession(session.id)} title={t('resume') as string} className="p-2 bg-green-600/80 rounded-lg hover:bg-green-600 transition-all group-hover:scale-110"><PlayIcon className="w-6 h-6"/></button>
                                      <button onClick={() => handleExportSession(session.id)} title={t('exportSession') as string} className="p-2 bg-sky-600/80 rounded-lg hover:bg-sky-600 transition-all group-hover:scale-110"><ArrowDownTrayIcon className="w-6 h-6"/></button>
                                      <button onClick={() => setSessionToDelete(session.id)} title={t('delete') as string} className="p-2 bg-red-600/80 rounded-lg hover:bg-red-600 transition-all group-hover:scale-110"><TrashIcon className="w-6 h-6"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 px-6 bg-slate-900/50 rounded-lg border border-slate-700">
                        <p className="text-slate-400">{t('noSessionsMessage') as string}</p>
                      </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center mb-4 mt-8">
                    <h2 className="text-2xl font-bold text-teal-300">{t('startNew')}</h2>
                     <button 
                        onClick={() => setIsNarrationEnabled(!isNarrationEnabled)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${isNarrationEnabled ? 'bg-teal-600 border-teal-500 text-white shadow-md' : 'bg-slate-700/80 border-slate-600 text-slate-300'} hover:border-amber-400 hover:text-white`} 
                        title={t('narrate') as string}
                    >
                        {isNarrationEnabled ? <SpeakerOnIcon className="w-5 h-5" /> : <SpeakerOffIcon className="w-5 h-5" />}
                        <span className="hidden sm:inline font-semibold">{t('narrate') as string}</span>
                    </button>
                </div>

                <p className="text-lg text-slate-300 mb-6 text-left">{t('description')}</p>
                <div className="relative w-full">
                    <textarea
                        ref={promptTextareaRef}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pr-14 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition duration-200 h-28 resize-none"
                        placeholder={t('placeholder') as string}
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
                        title={t('generatePromptIdea') as string}
                        className="absolute top-3 right-3 p-2 rounded-full bg-teal-600/50 text-teal-300 hover:bg-teal-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-9 w-9"
                    >
                        {isGeneratingIdea ? <LoadingSpinner size="small" /> : <SparklesIcon className="w-5 h-5" />}
                    </button>
                </div>
                
                 <div className="mt-6 text-left">
                    <h3 className="text-lg font-semibold text-teal-300 mb-3">{t('visualStyle')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {styleOptions.map(style => {
                            const isSelected = visualStyleSelection === style.id;
                            return (
                                <button
                                    key={style.id}
                                    onClick={() => setVisualStyleSelection(style.id)}
                                    className={`
                                        bg-gradient-to-br from-slate-800 to-slate-700 
                                        border-2 rounded-lg overflow-hidden text-center cursor-pointer
                                        transform transition-all duration-300 group 
                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-400
                                        ${isSelected 
                                            ? 'scale-105 border-teal-400 shadow-2xl shadow-teal-400/20' 
                                            : 'border-slate-700 shadow-inner shadow-black/50 hover:scale-105 hover:border-teal-500/70 hover:shadow-xl active:scale-100'
                                        }
                                    `}
                                >
                                    <img src={style.imageUrl} alt={style.name} className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300" />
                                    <div className={`
                                        p-3 border-t-2 bg-slate-800/50 backdrop-blur-sm
                                        transition-colors duration-300
                                        ${isSelected ? 'border-teal-400' : 'border-slate-700 group-hover:border-teal-500/70'}
                                    `}>
                                        <h4 className={`
                                            font-bold transition-colors duration-300
                                            ${isSelected ? 'text-teal-300' : 'text-slate-300 group-hover:text-white'}
                                        `}>{t(style.id as keyof typeof translations.en) as string || style.name}</h4>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    {visualStyleSelection === 'custom' && (
                      <div className="relative w-full mt-4 animate-fadeIn">
                          <textarea
                              ref={customStyleTextareaRef}
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pr-14 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition duration-200 h-20 resize-none"
                              placeholder={t('visualStylePlaceholder') as string}
                              value={customVisualStyle}
                              onChange={(e) => {
                                  setCustomVisualStyle(e.target.value);
                                  setIsCustomStyleAiGenerated(false);
                              }}
                              disabled={isGeneratingStyleIdea || gameState === 'LOADING'}
                          />
                          <button
                              onClick={handleGenerateStyleIdea}
                              disabled={isGeneratingStyleIdea || gameState === 'LOADING'}
                              title={t('generateStyleIdea') as string}
                              className="absolute top-3 right-3 p-2 rounded-full bg-teal-600/50 text-teal-300 hover:bg-teal-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-9 w-9"
                          >
                              {isGeneratingStyleIdea ? <LoadingSpinner size="small" /> : <SparklesIcon className="w-5 h-5" />}
                          </button>
                      </div>
                    )}
                </div>
                <button
                    onClick={handleStartNewGame}
                    disabled={gameState === 'LOADING' || isGeneratingIdea || isGeneratingStyleIdea}
                    className="mt-8 w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 font-bold py-3 px-4 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                  <WandIcon className="w-6 h-6" /> {t('beginAdventure')}
                </button>
                <Tooltip data={tooltipData} ref={tooltipContentRef} />
            </div>
        </div>
      );
  }
  
  const renderGame = () => {
    if (!activeSession) return null;
    const currentStep = activeSession.history[currentStepIndex];

    return (
        <div className="flex flex-col w-full h-full max-w-7xl mx-auto">
             {isNarrationEnabled && (
                <LiveNarrator
                    ref={narratorRef}
                    storyStep={currentStep}
                    language={language}
                    narrationSpeed={narrationSpeed}
                    onChoiceSelected={(choice) => handleSelectChoice(choice, 'voice')}
                    onNarrationStateChange={setNarrationState}
                    clickedChoiceToNarrate={clickedChoiceToNarrate}
                    onError={(e) => {
                        console.error("Narration error:", e);
                        setError(t('errorNarration') as string);
                        setIsNarrationEnabled(false); // Disable on error to prevent cycles
                    }}
                />
            )}
            <header className="w-full flex justify-between items-center mb-4 flex-shrink-0 animate-fadeIn p-2 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700">
                <button onClick={() => { setActiveSession(null); setGameState('SESSION_SELECT'); }} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors" title={t('home') as string}>
                    <HomeIcon className="w-5 h-5 text-amber-400"/>
                    <span className="hidden md:inline font-semibold">{t('home') as string}</span>
                </button>
                <h1 className="text-xl font-bold text-amber-300 mx-4 text-center flex-grow hidden sm:block truncate" style={{textShadow: '1px 1px 2px #000'}}>
                    {activeSession.title}
                </h1>
                <div className="flex items-center gap-2 md:gap-4">
                    {isNarrationEnabled && (
                         <button
                            onClick={handleCycleNarrationSpeed}
                            className="bg-slate-700/80 border border-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors hover:border-amber-400"
                            title={`${t('speed')} ${narrationSpeed}x`}
                        >
                            <span className="font-semibold">{narrationSpeed}x</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setIsNarrationEnabled(!isNarrationEnabled)} 
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${isNarrationEnabled ? 'bg-teal-600 border-teal-500 text-white shadow-md' : 'bg-slate-700/80 border-slate-600 text-slate-300'} hover:border-amber-400 hover:text-white`} 
                        title={t('narrate') as string}
                    >
                         { isNarrationEnabled ? <SpeakerOnIcon className="w-5 h-5" /> : <SpeakerOffIcon className="w-5 h-5" />}
                        <span className="hidden lg:inline font-semibold">{t('narrate') as string}</span>
                        {isNarrationEnabled && narrationState !== 'IDLE' && (
                           <span className="absolute -top-1 -right-1 flex h-4 w-4">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 justify-center items-center">
                               {narrationState === 'LISTENING' && <MicrophoneIcon className="w-2.5 h-2.5" />}
                             </span>
                           </span>
                        )}
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
                        inventory: t('inventory') as string, 
                        currentQuest: t('currentQuest') as string, 
                        emptyInventory: t('emptyInventory') as string, 
                        noQuest: t('noQuest') as string,
                        storyTimeline: t('storyTimeline') as string
                    }}
                    sessionHistory={activeSession.history}
                    currentIndex={currentStepIndex}
                    onStepSelect={setCurrentStepIndex}
                />
                <StoryView
                    session={activeSession}
                    currentIndex={currentStepIndex}
                    onSelectChoice={(choice) => handleSelectChoice(choice, 'click')}
                    onPrev={() => setCurrentStepIndex(i => Math.max(0, i-1))}
                    onNext={() => setCurrentStepIndex(i => Math.min(activeSession.history.length - 1, i+1))}
                    gameState={gameState}
                    narrationState={narrationState}
                    optimisticChoice={optimisticChoice}
                    onSkipNarration={() => narratorRef.current?.skip()}
                    t={t}
                />
            </div>
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

      {(error || importSuccessMessage) && (
        <div className="fixed bottom-4 right-4 z-[100] animate-fadeIn">
            {error && <div className="bg-red-800/90 border border-red-600 text-white p-4 rounded-lg shadow-lg">{error}</div>}
            {importSuccessMessage && <div className="bg-green-800/90 border border-green-600 text-white p-4 rounded-lg shadow-lg">{importSuccessMessage}</div>}
        </div>
      )}


      {showBranchConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-slate-800 border border-amber-500 rounded-lg shadow-xl p-6 max-w-sm text-center">
            <h3 className="text-xl font-bold text-white mb-2">{t('branchConfirmTitle') as string}</h3>
            <p className="text-slate-300 mb-6">{t('branchConfirmMessage') as string}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowBranchConfirm(null)} className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors">{t('cancel') as string}</button>
              <button onClick={confirmBranching} className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-semibold">{t('confirm') as string}</button>
            </div>
          </div>
        </div>
      )}

      {sessionToDelete && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-slate-800 border border-red-500 rounded-lg shadow-xl p-6 max-w-sm text-center">
            <h3 className="text-xl font-bold text-white mb-2">{t('deleteConfirmTitle') as string}</h3>
            <p className="text-slate-300 mb-6">{t('deleteConfirm') as string}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setSessionToDelete(null)} className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors">{t('cancel') as string}</button>
              <button onClick={confirmDeleteSession} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold">{t('delete') as string}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
