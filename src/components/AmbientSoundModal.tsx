import React, { useState } from 'react';
import { 
  X, 
  Headphones, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Waves, 
  Trees, 
  Radio, 
  Activity,
  Keyboard
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { ambientAudio } from '../utils/ambientAudio';
import { useFocusTrap } from '../utils/useFocusTrap';

interface AmbientSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  playTypewriterSound: boolean;
  onToggleTypewriterSound: (val: boolean) => void;
  onAudioStateChange: () => void;
}

export const AmbientSoundModal: React.FC<AmbientSoundModalProps> = ({
  isOpen,
  onClose,
  theme,
  playTypewriterSound,
  onToggleTypewriterSound,
  onAudioStateChange,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [activeSound, setActiveSound] = useState<string | null>(
    ambientAudio.getStatus().isPlaying ? ambientAudio.getStatus().currentType : null
  );
  const [volume, setVolume] = useState<number>(ambientAudio.getStatus().volume);

  if (!isOpen) return null;

  const SOUND_PRESETS = [
    { id: 'rain', label: 'Lofi Rain', desc: 'Gentle raindrops on window', icon: CloudRain },
    { id: 'waves', label: 'Ocean Tide', desc: 'Deep rhythmic coastal waves', icon: Waves },
    { id: 'forest', label: 'Forest Wind', desc: 'Leaves rustling in pine woods', icon: Trees },
    { id: 'whitenoise', label: 'Pink Noise', desc: 'Continuous soothing frequency', icon: Radio },
    { id: 'binaural', label: 'Alpha Focus (10Hz)', desc: 'Binaural beats for deep concentration', icon: Activity },
  ];

  const handleSelectSound = (type: any) => {
    if (activeSound === type) {
      ambientAudio.stop();
      setActiveSound(null);
    } else {
      ambientAudio.play(type, volume);
      setActiveSound(type);
    }
    onAudioStateChange();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientAudio.setVolume(newVol);
  };

  const handleStopAll = () => {
    ambientAudio.stop();
    setActiveSound(null);
    onAudioStateChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose} 
      />

      <div 
        ref={modalRef}
        className="relative max-w-md w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-6"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Ambient Focus Audio"
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-base">Ambient Focus Audio</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ambient Sound Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: theme.textMuted }}>
            Procedural Soundscapes
          </label>
          <div className="grid grid-cols-1 gap-2">
            {SOUND_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isPlaying = activeSound === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectSound(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isPlaying 
                      ? 'ring-2 ring-amber-500 shadow-xs' 
                      : 'hover:bg-stone-500/5'
                  }`}
                  style={{
                    borderColor: isPlaying ? theme.accent : theme.border,
                    backgroundColor: isPlaying ? theme.bgElevated : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPlaying ? 'bg-amber-500 text-white' : 'bg-stone-500/10'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{preset.label}</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{preset.desc}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-medium ${isPlaying ? 'text-amber-600 dark:text-amber-400' : 'opacity-40'}`}>
                    {isPlaying ? 'Playing' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume Slider */}
        {activeSound && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Volume</span>
              </span>
              <span className="font-mono">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>
        )}

        {/* Typewriter sound toggle */}
        <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
          <label className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:bg-stone-500/5 transition-colors" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-stone-500/10">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Mechanical Key Clicks</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>Acoustic feedback as you type</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={playTypewriterSound}
              onChange={(e) => onToggleTypewriterSound(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          {activeSound ? (
            <button
              type="button"
              onClick={handleStopAll}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute All Audio</span>
            </button>
          ) : <span />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-stone-500/10 cursor-pointer transition-colors"
            style={{ borderColor: theme.border }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
