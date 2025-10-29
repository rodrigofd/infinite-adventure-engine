import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

export interface TooltipData {
    visible: boolean;
    content: {
        text: string;
        choice?: string;
    };
    x: number;
    y: number;
}

const Tooltip = forwardRef<HTMLDivElement, { data: TooltipData }>(({ data }, ref) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: -9999, left: -9999 });

    useLayoutEffect(() => {
        if (data.visible && tooltipRef.current) {
            const { x, y } = data;
            const { offsetWidth: width, offsetHeight: height } = tooltipRef.current;
            const { innerWidth, innerHeight } = window;
    
            const offset = 15; // How far from the cursor
    
            let newLeft = x + offset;
            let newTop = y + offset;
    
            // Flip horizontally if it goes off the right edge of the screen
            if (newLeft + width > innerWidth - 5) { // 5px buffer
                newLeft = x - width - offset;
            }
            // Flip vertically if it goes off the bottom edge
            if (newTop + height > innerHeight - 5) { // 5px buffer
                newTop = y - height - offset;
            }
            
            // Ensure it doesn't go off the left or top edges after flipping
            if (newLeft < 5) {
                newLeft = 5;
            }
            if (newTop < 5) {
                newTop = 5;
            }
    
            setPosition({ top: newTop, left: newLeft });
        }
    }, [data.x, data.y, data.visible, data.content.text]); // Also re-run when content changes, as that affects size

    const portalRoot = document.getElementById('portals');
    if (!portalRoot) return null;

    const tooltipContent = (
        <div
            ref={tooltipRef}
            className="fixed bg-slate-800/80 backdrop-blur-md text-white rounded-lg p-3 w-96 z-[9999] pointer-events-none transition-opacity duration-200 border border-slate-600 shadow-2xl"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                opacity: data.visible ? 1 : 0,
                visibility: data.visible ? 'visible' : 'hidden'
            }}
        >
            <div ref={ref} className="max-h-52 overflow-y-auto custom-scrollbar pr-2">
                <p className="whitespace-pre-wrap text-sm">{data.content.text}</p>
                {data.content.choice && (
                    <p className="mt-2 pt-2 border-t border-amber-500/50 text-amber-300 italic">
                        {`> ${data.content.choice}`}
                    </p>
                )}
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(tooltipContent, portalRoot);
});

export default Tooltip;