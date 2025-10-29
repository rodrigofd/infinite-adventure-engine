
import React from 'react';
import { BackpackIcon, CompassIcon, ViewColumnsIcon } from './Icons';
import { StoryStep, InventoryItem } from '../types';
import { ComicStrip } from './ComicStrip';

interface SidebarProps {
  inventory: InventoryItem[];
  currentQuest: string;
  translations: {
    inventory: string;
    currentQuest: string;
    emptyInventory: string;
    noQuest: string;
    storyTimeline: string;
  }
  sessionHistory: StoryStep[];
  currentIndex: number;
  onStepSelect: (index: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ inventory, currentQuest, translations, sessionHistory, currentIndex, onStepSelect }) => {
  return (
    <aside className="w-full md:w-1/3 lg:w-1/4 bg-slate-800/30 backdrop-blur-sm p-6 rounded-lg border border-slate-700 flex flex-col gap-8 h-full animate-fadeIn">
      <div className="flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-amber-400 flex items-center gap-3">
            <BackpackIcon className="w-7 h-7" />
            {translations.inventory}
          </h2>
          {inventory.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {inventory.map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-slate-900/50 rounded-lg p-1 border border-slate-600 group-hover:border-amber-400 transition-colors">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded-md" />
                  </div>
                  <p className="text-xs text-gray-300 mt-2 group-hover:text-white transition-colors">{item.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">{translations.emptyInventory}</p>
          )}
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-amber-400 flex items-center gap-3">
            <CompassIcon className="w-7 h-7" />
            {translations.currentQuest}
          </h2>
          <p className="text-gray-300 leading-relaxed">
            {currentQuest || translations.noQuest}
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-grow min-h-0">
        <h2 className="text-2xl font-bold mb-4 text-amber-400 flex items-center gap-3 flex-shrink-0">
          <ViewColumnsIcon className="w-7 h-7" />
          {translations.storyTimeline}
        </h2>
        <div className="flex-grow min-h-0">
            <ComicStrip 
                steps={sessionHistory} 
                currentIndex={currentIndex} 
                onTileClick={onStepSelect} 
            />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;