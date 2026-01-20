
const SFX_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  timesUp: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
};

class AudioService {
  private sfx: Record<string, HTMLAudioElement> = {};
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sfx.correct = new Audio(SFX_URLS.correct);
      this.sfx.wrong = new Audio(SFX_URLS.wrong);
      this.sfx.tick = new Audio(SFX_URLS.tick);
      this.sfx.timesUp = new Audio(SFX_URLS.timesUp);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  playSfx(type: 'correct' | 'wrong' | 'tick' | 'timesUp', volume: number = 0.3) {
    if (this.isMuted) return;
    const audio = this.sfx[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(err => console.debug('SFX blocked:', err));
    }
  }

  stopSfx(type: 'correct' | 'wrong' | 'tick' | 'timesUp') {
    const audio = this.sfx[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Background music is disabled.
   * Method kept for compatibility with App.tsx calls.
   */
  setBgMusic(playing: boolean) {
    // Background audio removed per user request
  }
}

export const audioService = new AudioService();
