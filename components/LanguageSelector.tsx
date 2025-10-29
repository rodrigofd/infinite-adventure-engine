import React, { useState, useRef, useEffect } from 'react';
import { GlobeAltIcon } from './Icons';

interface LanguageSelectorProps {
    language: 'en' | 'es' | 'pt';
    setLanguage: (lang: 'en' | 'es' | 'pt') => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, setLanguage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const languages = {
        en: { name: "English", flag: "🇺🇸" },
        es: { name: "Español", flag: "🇪🇸" },
        pt: { name: "Português", flag: "🇵🇹" },
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleSelect = (lang: 'en' | 'es' | 'pt') => {
        setLanguage(lang);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
                <GlobeAltIcon className="w-6 h-6 text-teal-400" />
                <span className="text-gray-200">{languages[language].flag} {languages[language].name}</span>
            </button>
            {isOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-lg z-50 w-48 animate-fadeIn overflow-hidden"
                >
                    <ul className="py-1">
                        {(Object.keys(languages) as Array<'en' | 'es' | 'pt'>).map(lang => (
                            <li key={lang}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleSelect(lang); }}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-teal-600 hover:text-white"
                                >
                                    <span className="text-xl">{languages[lang].flag}</span>
                                    <span>{languages[lang].name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;