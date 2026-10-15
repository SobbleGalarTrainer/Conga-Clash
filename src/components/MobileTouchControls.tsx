import React, { useRef, useState, useEffect, useCallback } from 'react';

interface MobileTouchControlsProps {
  onMove?: (dx: number, dy: number, angle: number) => void;
  onDash?: () => void;
  onEmote?: () => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  onMove,
  onDash,
  onEmote,
}) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());

  // Helper to dispatch synthetic key events for universal compatibility
  const updateSimulatedKeys = useCallback((dx: number, dy: number) => {
    const threshold = 0.28;
    const nextKeys = new Set<string>();

    if (dy < -threshold) {
      nextKeys.add('arrowup');
      nextKeys.add('w');
    } else if (dy > threshold) {
      nextKeys.add('arrowdown');
      nextKeys.add('s');
    }

    if (dx < -threshold) {
      nextKeys.add('arrowleft');
      nextKeys.add('a');
    } else if (dx > threshold) {
      nextKeys.add('arrowright');
      nextKeys.add('d');
    }

    // Release keys no longer active
    activeKeysRef.current.forEach((k) => {
      if (!nextKeys.has(k)) {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
      }
    });

    // Press newly active keys
    nextKeys.forEach((k) => {
      if (!activeKeysRef.current.has(k)) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      }
    });

    activeKeysRef.current = nextKeys;
  }, []);

  const releaseAllKeys = useCallback(() => {
    activeKeysRef.current.forEach((k) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
    });
    activeKeysRef.current.clear();
  }, []);

  // Cleanup keys on unmount
  useEffect(() => {
    return () => {
      releaseAllKeys();
    };
  }, [releaseAllKeys]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current || touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current || touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const rect = joystickBaseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const rawDx = touch.clientX - centerX;
        const rawDy = touch.clientY - centerY;
        const maxRadius = rect.width / 2;
        const distance = Math.hypot(rawDx, rawDy);
        const clampedDist = Math.min(distance, maxRadius);
        const angle = Math.atan2(rawDy, rawDx);

        const normX = distance > 0 ? (Math.cos(angle) * clampedDist) / maxRadius : 0;
        const normY = distance > 0 ? (Math.sin(angle) * clampedDist) / maxRadius : 0;

        setKnobPos({
          x: Math.cos(angle) * clampedDist,
          y: Math.sin(angle) * clampedDist,
        });

        // Trigger move callback
        if (onMove) {
          onMove(normX, normY, angle);
        }

        // Dispatch keyboard equivalents
        updateSimulatedKeys(normX, normY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setKnobPos({ x: 0, y: 0 });
        releaseAllKeys();
        if (onMove) onMove(0, 0, 0);
        break;
      }
    }
  };

  const triggerDash = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    }, 200);
    if (onDash) onDash();
  };

  const triggerEmote = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true }));
    }, 100);
    if (onEmote) onEmote();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-slate-900/90 text-amber-400 border border-amber-500/40 rounded-full px-3 py-1.5 text-xs font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
        >
          <span>🕹️</span>
          <span>Show Controls</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 pointer-events-none select-none px-4 flex items-end justify-between max-w-5xl mx-auto">
      {/* Left: Virtual Touch Joystick */}
      <div className="pointer-events-auto flex flex-col items-start gap-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800 backdrop-blur-sm">
          <span>🕹️ Steer Conga</span>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white ml-1 px-1 rounded hover:bg-slate-800"
            title="Minimize virtual joystick"
          >
            ✕
          </button>
        </div>

        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 ${
            isActive ? 'border-amber-400 bg-amber-950/30' : 'border-slate-600/70 bg-slate-950/50'
          } backdrop-blur-md shadow-2xl relative flex items-center justify-center transition-colors touch-none`}
        >
          {/* Center target circle */}
          <div className="w-10 h-10 rounded-full border border-slate-600/50 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold text-slate-500">CONGA</span>
          </div>

          {/* Movable Knob */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isActive ? 'none' : 'transform 0.15s ease-out',
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${
              isActive
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-amber-500/50 ring-2 ring-white/60'
                : 'bg-gradient-to-tr from-slate-700 to-slate-500'
            } shadow-lg absolute flex items-center justify-center pointer-events-none`}
          >
            <span className="text-xl sm:text-2xl select-none">🪇</span>
          </div>

          {/* Compass Arrows */}
          <span className="absolute top-1 text-[9px] font-bold text-slate-500 pointer-events-none">▲</span>
          <span className="absolute bottom-1 text-[9px] font-bold text-slate-500 pointer-events-none">▼</span>
          <span className="absolute left-1.5 text-[9px] font-bold text-slate-500 pointer-events-none">◀</span>
          <span className="absolute right-1.5 text-[9px] font-bold text-slate-500 pointer-events-none">▶</span>
        </div>
      </div>

      {/* Right: Quick Action Buttons (Dash, Emote) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5 mb-1">
        {/* Quick Emote Cheer */}
        <button
          onTouchStart={triggerEmote}
          onClick={triggerEmote}
          className="w-14 h-14 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-2 border-amber-500/40 shadow-xl flex flex-col items-center justify-center active:scale-90 transition-transform backdrop-blur-md cursor-pointer"
          title="Cheer / Emote"
        >
          <span className="text-xl">💃</span>
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Emote</span>
        </button>

        {/* Dash / Conga Boost */}
        <button
          onTouchStart={triggerDash}
          onClick={triggerDash}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-600 to-amber-400 text-slate-950 font-black shadow-xl shadow-orange-500/30 border-2 border-white/60 flex flex-col items-center justify-center active:scale-90 transition-transform backdrop-blur-md cursor-pointer"
          title="Conga Dash Boost"
        >
          <span className="text-2xl">⚡</span>
          <span className="text-[10px] font-display font-black uppercase tracking-wider">BOOST</span>
        </button>
      </div>
    </div>
  );
};
