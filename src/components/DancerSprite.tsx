import React from 'react';
import { Character, HatStyle } from '../types/game';

interface DancerSpriteProps {
  character: Character;
  size?: number;
  isDancing?: boolean;
  isLeader?: boolean;
  kickBeat?: boolean;
  isLoserStumble?: boolean;
  showHandsOnHips?: boolean;
  facing?: 'left' | 'right' | 'front';
  className?: string;
}

export const DancerSprite: React.FC<DancerSpriteProps> = ({
  character,
  size = 64,
  isDancing = true,
  isLeader = false,
  kickBeat = false,
  isLoserStumble = false,
  showHandsOnHips = false,
  facing = 'right',
  className = '',
}) => {
  const { hat, hairColor, shirtColor, pantsColor, skinTone, accessoryColor } = character;

  const renderHat = (style: HatStyle) => {
    switch (style) {
      case 'sombrero':
        return (
          <g transform="translate(0, -18)">
            {/* Sombrero wide brim */}
            <ellipse cx="32" cy="20" rx="26" ry="6" fill="#ca8a04" stroke="#a16207" strokeWidth="1.5" />
            <path d="M12 20 Q32 23 52 20" stroke="#facc15" strokeWidth="1.5" fill="none" />
            {/* Sombrero crown */}
            <path d="M22 20 L24 9 Q32 6 40 9 L42 20 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
            <line x1="24" y1="14" x2="40" y2="14" stroke="#ef4444" strokeWidth="2" />
          </g>
        );
      case 'feathers':
        return (
          <g transform="translate(0, -22)">
            {/* Carnival feathers */}
            <path d="M22 26 C16 12 18 0 26 2 C28 14 26 24 24 26 Z" fill="#ec4899" />
            <path d="M30 24 C28 6 34 -4 38 0 C40 12 34 22 32 24 Z" fill="#06b6d4" />
            <path d="M36 26 C42 12 48 4 44 8 C40 16 38 24 36 26 Z" fill="#eab308" />
            <ellipse cx="32" cy="25" rx="10" ry="2.5" fill="#f43f5e" />
          </g>
        );
      case 'party_hat':
        return (
          <g transform="translate(0, -20)">
            <polygon points="32,2 22,23 42,23" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
            <circle cx="32" cy="2" r="3" fill="#f59e0b" />
            <line x1="25" y1="16" x2="39" y2="16" stroke="#ec4899" strokeWidth="2" strokeDasharray="2,2" />
          </g>
        );
      case 'disco_afro':
        return (
          <g transform="translate(0, -14)">
            <circle cx="32" cy="18" r="16" fill={hairColor} />
            <circle cx="20" cy="18" r="8" fill={hairColor} />
            <circle cx="44" cy="18" r="8" fill={hairColor} />
            <circle cx="32" cy="8" r="8" fill={hairColor} />
          </g>
        );
      case 'flower_lei':
        return (
          <g transform="translate(0, -8)">
            <circle cx="22" cy="16" r="3" fill="#ec4899" />
            <circle cx="27" cy="14" r="3" fill="#f59e0b" />
            <circle cx="32" cy="13" r="3.5" fill="#10b981" />
            <circle cx="37" cy="14" r="3" fill="#06b6d4" />
            <circle cx="42" cy="16" r="3" fill="#a855f7" />
          </g>
        );
      case 'chef_hat':
        return (
          <g transform="translate(0, -22)">
            <ellipse cx="32" cy="12" rx="13" ry="9" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
            <circle cx="23" cy="8" r="6" fill="#ffffff" />
            <circle cx="41" cy="8" r="6" fill="#ffffff" />
            <rect x="23" y="16" width="18" height="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          </g>
        );
      case 'sunglasses':
        return (
          <g transform="translate(0, 0)">
            {/* Cool retro shades */}
            <path d="M22 18 L30 18 L29 23 L23 23 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <path d="M34 18 L42 18 L41 23 L35 23 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <line x1="30" y1="19" x2="34" y2="19" stroke="#3f3f46" strokeWidth="1.5" />
            <line x1="23" y1="19" x2="28" y2="22" stroke="#60a5fa" strokeWidth="0.8" opacity="0.8" />
          </g>
        );
      case 'carnival_mask':
        return (
          <g transform="translate(0, 0)">
            <path d="M20 18 Q32 25 44 18 Q32 21 20 18 Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="1" />
            <circle cx="26" cy="19" r="2.5" fill="#1e1b4b" />
            <circle cx="38" cy="19" r="2.5" fill="#1e1b4b" />
            <circle cx="32" cy="21" r="1.5" fill="#facc15" />
          </g>
        );
      case 'crown':
        return (
          <g transform="translate(0, -18)">
            <polygon points="20,22 20,10 26,16 32,7 38,16 44,10 44,22" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="20" cy="9" r="1.5" fill="#ef4444" />
            <circle cx="32" cy="6" r="2" fill="#3b82f6" />
            <circle cx="44" cy="9" r="1.5" fill="#10b981" />
          </g>
        );
      case 'headband':
        return (
          <g transform="translate(0, -6)">
            <rect x="22" y="16" width="20" height="4" rx="2" fill="#ec4899" stroke="#db2777" strokeWidth="0.8" />
            <circle cx="38" cy="18" r="3" fill="#facc15" />
          </g>
        );
      default:
        return null;
    }
  };

  const isFlipped = facing === 'left';

  return (
    <div
      className={`relative inline-block transition-transform ${isDancing ? 'animate-conga-step' : ''} ${
        isLoserStumble ? 'rotate-12 translate-y-3 opacity-80' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        transform: isFlipped ? 'scaleX(-1)' : undefined,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        {/* Shadow on floor */}
        <ellipse cx="32" cy="60" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />

        {/* Legs: Back Leg */}
        <g
          className={kickBeat ? 'animate-conga-kick-leg' : ''}
          style={{ transformOrigin: '28px 46px' }}
        >
          <path
            d="M26 44 L25 56 L31 56"
            stroke={pantsColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Shoe */}
          <ellipse cx="29" cy="57" rx="4" ry="2.5" fill="#09090b" />
        </g>

        {/* Legs: Front Leg (The Kick Leg!) */}
        <g
          className={kickBeat ? 'animate-conga-kick-leg' : ''}
          style={{
            transformOrigin: '36px 46px',
            transform: kickBeat ? 'rotate(35deg) translateY(-6px)' : undefined,
            transition: 'transform 0.15s ease-out',
          }}
        >
          <path
            d="M36 44 L39 56 L46 56"
            stroke={pantsColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Shoe */}
          <ellipse cx="44" cy="57" rx="4.5" ry="2.5" fill="#09090b" />
        </g>

        {/* Torso & Shirt */}
        <rect
          x="22"
          y="29"
          width="20"
          height="17"
          rx="5"
          fill={shirtColor}
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Belt / Sash */}
        <rect x="22" y="42" width="20" height="4" fill={accessoryColor} />
        <rect x="30" y="42" width="4" height="4" fill="#facc15" />

        {/* Conga Arms: Reaching forward to hold hips of front person */}
        {showHandsOnHips || !isLeader ? (
          <g>
            {/* Back Arm reaching forward */}
            <path
              d="M24 33 L14 36 L12 40"
              stroke={skinTone}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Front Arm reaching forward onto next waist */}
            <path
              d="M38 33 L52 35 L56 39"
              stroke={skinTone}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Hand glove/wrist */}
            <circle cx="56" cy="39" r="2.5" fill={skinTone} />
          </g>
        ) : (
          /* Leader Arm: Shaking Maracas or Leading the Parade */
          <g>
            <path
              d="M23 34 L16 28 L14 20"
              stroke={skinTone}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Maraca */}
            <circle cx="13" cy="18" r="4" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <line x1="14" y1="21" x2="16" y2="26" stroke="#78350f" strokeWidth="2" />

            {/* Right Arm raised in cheer */}
            <path
              d="M40 33 L48 27 L52 18"
              stroke={skinTone}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Maraca */}
            <circle cx="53" cy="16" r="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <line x1="51" y1="19" x2="48" y2="25" stroke="#78350f" strokeWidth="2" />
          </g>
        )}

        {/* Head */}
        <circle cx="32" cy="20" r="10" fill={skinTone} stroke="#1e293b" strokeWidth="1" />

        {/* Hair (base if not afro) */}
        {hat !== 'disco_afro' && (
          <path
            d="M22 18 C22 11 42 11 42 18 C38 14 26 14 22 18 Z"
            fill={hairColor}
          />
        )}

        {/* Face Elements */}
        {hat !== 'sunglasses' && hat !== 'carnival_mask' && (
          <g>
            {/* Eyes */}
            <circle cx="29" cy="19" r="1.5" fill="#18181b" />
            <circle cx="35" cy="19" r="1.5" fill="#18181b" />
            {/* Cheerful Cheeks */}
            <circle cx="26" cy="22" r="2" fill="#fb7185" opacity="0.6" />
            <circle cx="38" cy="22" r="2" fill="#fb7185" opacity="0.6" />
          </g>
        )}

        {/* Big Happy Conga Smile */}
        <path
          d={isLoserStumble ? 'M28 24 Q32 21 36 24' : 'M28 22 Q32 26 36 22'}
          stroke="#18181b"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Hat / Head Accessory */}
        {renderHat(hat)}

        {/* Leader Whistle or Crown shine */}
        {isLeader && (
          <g transform="translate(32, 24)">
            <ellipse cx="2" cy="1" rx="2" ry="1.5" fill="#facc15" />
            <line x1="2" y1="1" x2="6" y2="2" stroke="#facc15" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};
