import React, { useState, useMemo, useRef } from 'react';
import { StoryStep } from '../types';
import Tooltip, { TooltipData } from './Tooltip';

interface ComicStripProps {
    steps: StoryStep[];
    currentIndex: number;
    onTileClick: (index: number) => void;
}

const generateLayout = (totalSteps: number): number[][] => {
    const rows: number[][] = [];
    let currentStepIndex = 0;

    while (currentStepIndex < totalSteps) {
        const remaining = totalSteps - currentStepIndex;
        const rand = Math.random();
        let rowSize: number;

        if (remaining <= 1) {
            rowSize = 1;
        } else if (remaining === 2) {
             rowSize = rand < 0.7 ? 2 : 1; // 70% chance of 2 tiles, else 1 full
        } else if (remaining === 3) {
            rowSize = rand < 0.7 ? 3 : (rand < 0.9 ? 2 : 1); // 70% 3, 20% 2, 10% 1
        } else {
            if (rand < 0.1) { // 10% for 1 tile
                rowSize = 1;
            } else if (rand < 0.7) { // 60% for 2 tiles
                rowSize = 2;
            } else { // 30% for 3 tiles
                rowSize = 3;
            }
        }
        
        const row = [];
        for (let i = 0; i < rowSize && currentStepIndex < totalSteps; i++) {
            row.push(currentStepIndex++);
        }
        rows.push(row);
    }
    return rows;
};


export const ComicStrip: React.FC<ComicStripProps> = ({ steps, currentIndex, onTileClick }) => {
    const [tooltipData, setTooltipData] = useState<TooltipData>({ visible: false, content: { text: '' }, x: 0, y: 0 });
    const tooltipContentRef = useRef<HTMLDivElement>(null);

    const layout = useMemo(() => generateLayout(steps.length), [steps.length]);

    const handleMouseMove = (e: React.MouseEvent, step: StoryStep) => {
        const content = { text: step.story, choice: step.choiceMade };
        setTooltipData({ visible: true, content, x: e.clientX, y: e.clientY });
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

    const tileColsClass = (size: number) => {
        if (size === 1) return 'grid-cols-1';
        if (size === 2) return 'grid-cols-2';
        if (size === 3) return 'grid-cols-3';
        return '';
    }

    return (
        <div className="bg-slate-100 p-3 rounded-lg h-full overflow-y-auto custom-scrollbar">
            <Tooltip data={tooltipData} ref={tooltipContentRef} />
            <div className="space-y-3">
                {layout.map((row, rowIndex) => (
                    <div key={rowIndex} className={`grid ${tileColsClass(row.length)} gap-3`}>
                        {row.map((stepIndex) => {
                            const step = steps[stepIndex];
                            const isActive = stepIndex === currentIndex;
                            const isFutureStep = stepIndex > currentIndex;

                            return (
                                <div
                                    key={step.id}
                                    className={`
                                        relative aspect-video rounded-md overflow-hidden cursor-pointer group transition-all duration-300
                                        ${isActive
                                            ? 'ring-4 ring-amber-500 shadow-lg'
                                            : isFutureStep
                                                ? 'filter grayscale opacity-50 hover:opacity-80'
                                                : 'ring-2 ring-slate-400 hover:scale-105 hover:ring-amber-400'
                                        }
                                    `}
                                    onClick={() => onTileClick(stepIndex)}
                                    onMouseMove={(e) => handleMouseMove(e, step)}
                                    onMouseLeave={handleMouseLeave}
                                    onWheel={handleTooltipWheelScroll}
                                >
                                    <img src={step.imageUrl} alt={`Step ${stepIndex + 1}`} className="w-full h-full object-cover" />
                                    <div className={`
                                        absolute inset-0 bg-black transition-opacity duration-300
                                        ${isActive
                                            ? 'opacity-0'
                                            : isFutureStep
                                                ? 'opacity-60 group-hover:opacity-50'
                                                : 'opacity-40 group-hover:opacity-10'
                                        }
                                    `}></div>
                                    <span className="absolute bottom-1 right-2 text-white font-bold text-base" style={{textShadow: '1px 1px 3px black'}}>{stepIndex + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
