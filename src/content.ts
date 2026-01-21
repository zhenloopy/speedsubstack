import { waitForArticle } from './utils/substack-detector';
import { extractArticleContent, getParagraphStart, type ExtractionResult, type ExtractedWord } from './parser/article-extractor';
import { loadSettings, onSettingsChange, type Settings } from './storage/settings';
import { loadProgress, saveProgress, cleanupOldProgress } from './storage/progress';
import { Overlay } from './ui/overlay';
import { Controls } from './ui/controls';
import { WpmSlider } from './ui/wpm-slider';
import { StartButton } from './ui/start-button';
import { Highlighter } from './ui/highlighter';
import { ScrollController } from './ui/scroll-controller';
import { TimingController } from './engine/timing-controller';
import { StateMachine, type ReaderState } from './engine/state-machine';
import { KeyboardHandler } from './engine/keyboard-handler';
import { findNextParagraphIndex, findPreviousParagraphIndex } from './engine/navigation';

class SpeedSubstackApp {
  private extractionResult: ExtractionResult | null = null;
  private articleContainer: HTMLElement | null = null;
  private settings: Settings = { enabled: true, wpm: 300, activationMode: 'manual', fontSize: 64, rampTime: 10, startingWpm: 150, autostartDelay: 1, paragraphPauseEnabled: false, paragraphPauseDuration: 0.5, paragraphRampUp: false, titleDisplay: true, headingDisplay: true, surroundingWords: 0, themeColor: '#FF6719' };
  private themeStyleElement: HTMLStyleElement | null = null;

  private overlay: Overlay;
  private controls: Controls;
  private wpmSlider: WpmSlider;
  private startButton: StartButton;
  private highlighter: Highlighter;
  private scrollController: ScrollController;
  private timingController: TimingController;
  private stateMachine: StateMachine;
  private keyboardHandler: KeyboardHandler;

  private unsubscribeSettings: (() => void) | null = null;
  private autoPlayTimer: number | null = null;
  private visibilityResumeTimer: number | null = null;
  private navigationResumeTimer: number | null = null;
  private wasPlayingBeforeNavigation = false;
  
  // Store bound handlers for cleanup
  private boundCloseHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private boundBeforeUnloadHandler: (() => void) | null = null;
  private wasPlayingBeforeHidden = false;

  constructor() {
    this.stateMachine = new StateMachine();

    this.timingController = new TimingController(this.settings.wpm, {
      onWordChange: this.handleWordChange.bind(this),
      onComplete: this.handleComplete.bind(this),
      onProgress: this.handleProgress.bind(this),
    });

    this.overlay = new Overlay();

    this.controls = new Controls({
      onPlayPause: this.togglePlayPause.bind(this),
      onSeek: this.handleSeek.bind(this),
      onRewind: this.handleRewind.bind(this),
      onForward: this.handleForward.bind(this),
    });

    this.wpmSlider = new WpmSlider(this.settings.wpm, {
      onChange: this.handleWpmChange.bind(this),
    }, 1200);

    this.startButton = new StartButton({
      onStart: this.startReading.bind(this),
      onGoToCurrentWord: this.goToCurrentWord.bind(this),
    });

    this.highlighter = new Highlighter();

    this.scrollController = new ScrollController({
      onScrollToArticle: this.handleScrollToArticle.bind(this),
      onScrollToReader: this.handleScrollToReader.bind(this),
    });

    this.keyboardHandler = new KeyboardHandler({
      onPlayPause: this.togglePlayPause.bind(this),
      onSkipForward: this.handleForward.bind(this),
      onSkipBackward: this.handleRewind.bind(this),
      onIncreaseWpm: () => this.wpmSlider.increaseWpm(),
      onDecreaseWpm: () => this.wpmSlider.decreaseWpm(),
      onClose: this.closeReader.bind(this),
      onShowAndPlay: this.showAndPlay.bind(this),
      isOverlayVisible: () => this.overlay.isVisible(),
    });

    this.stateMachine.onStateChange(this.handleStateChange.bind(this));
    
    // Setup lifecycle handlers
    this.setupLifecycleHandlers();
  }

  private clearAllTimers(): void {
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    if (this.visibilityResumeTimer !== null) {
      clearTimeout(this.visibilityResumeTimer);
      this.visibilityResumeTimer = null;
    }
    if (this.navigationResumeTimer !== null) {
      clearTimeout(this.navigationResumeTimer);
      this.navigationResumeTimer = null;
    }
  }

  private setupLifecycleHandlers(): void {
    // Pause when tab becomes hidden, resume when visible
    this.boundVisibilityHandler = () => {
      if (document.hidden) {
        // Clear any pending resume timer
        if (this.visibilityResumeTimer !== null) {
          clearTimeout(this.visibilityResumeTimer);
          this.visibilityResumeTimer = null;
        }
        this.wasPlayingBeforeHidden = this.timingController.getIsPlaying();
        if (this.wasPlayingBeforeHidden) {
          this.timingController.pause();
          this.stateMachine.pauseReading();
          this.controls.setPlaying(false);
        }
      } else {
        // Resume if was playing before, with configurable delay
        if (this.wasPlayingBeforeHidden && this.stateMachine.getState() === 'paused' && this.overlay.isVisible()) {
          const delayMs = this.settings.autostartDelay * 1000;
          if (delayMs === 0) {
            this.timingController.play();
            this.stateMachine.startReading();
            this.controls.setPlaying(true);
          } else {
            this.visibilityResumeTimer = window.setTimeout(() => {
              this.visibilityResumeTimer = null;
              if (this.wasPlayingBeforeHidden && this.stateMachine.getState() === 'paused') {
                this.timingController.play();
                this.stateMachine.startReading();
                this.controls.setPlaying(true);
              }
            }, delayMs);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // Cleanup on page unload
    this.boundBeforeUnloadHandler = () => this.destroy();
    window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);
  }

  async init(): Promise<void> {
    this.settings = await loadSettings();

    // Always set up settings change listener first
    this.unsubscribeSettings = onSettingsChange((changes) => {
      if (changes.enabled !== undefined) {
        const wasEnabled = this.settings.enabled;
        this.settings.enabled = changes.enabled;

        if (changes.enabled && !wasEnabled) {
          // Turning on - show UI and optionally start reading
          this.enableExtension();
        } else if (!changes.enabled && wasEnabled) {
          // Turning off - hide everything
          this.disableExtension();
        }
      }
      if (changes.wpm !== undefined) {
        this.settings.wpm = changes.wpm;
        this.wpmSlider.setWpm(changes.wpm);
        this.timingController.setWpm(changes.wpm);
      }
      if (changes.activationMode !== undefined) {
        const wasAuto = this.settings.activationMode === 'auto';
        this.settings.activationMode = changes.activationMode;

        if (this.settings.enabled && this.extractionResult) {
          if (changes.activationMode === 'auto') {
            // Switching to auto mode - start reading
            this.startReading();
          } else if (wasAuto && changes.activationMode === 'manual') {
            // Switching to manual mode - close reader if open
            this.closeReader();
          }
        }
      }
      if (changes.fontSize !== undefined) {
        this.settings.fontSize = changes.fontSize;
        this.overlay.setFontSize(changes.fontSize);
      }
      if (changes.rampTime !== undefined) {
        this.settings.rampTime = changes.rampTime;
        this.timingController.setRampTime(changes.rampTime);
      }
      if (changes.autostartDelay !== undefined) {
        this.settings.autostartDelay = changes.autostartDelay;
      }
      if (changes.paragraphPauseEnabled !== undefined) {
        this.settings.paragraphPauseEnabled = changes.paragraphPauseEnabled;
        this.timingController.setParagraphPause(this.settings.paragraphPauseEnabled, this.settings.paragraphPauseDuration);
      }
      if (changes.paragraphPauseDuration !== undefined) {
        this.settings.paragraphPauseDuration = changes.paragraphPauseDuration;
        this.timingController.setParagraphPause(this.settings.paragraphPauseEnabled, this.settings.paragraphPauseDuration);
      }
      if (changes.paragraphRampUp !== undefined) {
        this.settings.paragraphRampUp = changes.paragraphRampUp;
        this.timingController.setParagraphRampUp(changes.paragraphRampUp);
      }
      if (changes.titleDisplay !== undefined) {
        this.settings.titleDisplay = changes.titleDisplay;
        this.overlay.setTitleDisplay(changes.titleDisplay);
      }
      if (changes.headingDisplay !== undefined) {
        this.settings.headingDisplay = changes.headingDisplay;
        this.overlay.setHeadingDisplay(changes.headingDisplay);
      }
      if (changes.surroundingWords !== undefined) {
        this.settings.surroundingWords = changes.surroundingWords;
        this.overlay.setSurroundingWords(changes.surroundingWords);
      }
      if (changes.themeColor !== undefined) {
        this.settings.themeColor = changes.themeColor;
        this.applyThemeColor(changes.themeColor);
      }
    });

    if (!this.settings.enabled) {
      return;
    }

    this.applyThemeColor(this.settings.themeColor);
    this.timingController.setWpm(this.settings.wpm);
    this.timingController.setRampTime(this.settings.rampTime);
    this.timingController.setParagraphPause(this.settings.paragraphPauseEnabled, this.settings.paragraphPauseDuration);
    this.timingController.setParagraphRampUp(this.settings.paragraphRampUp);
    this.wpmSlider.setWpm(this.settings.wpm);
    this.overlay.setFontSize(this.settings.fontSize);

    const detection = await waitForArticle();

    if (!detection.isArticle || !detection.articleContainer) {
      return;
    }

    this.articleContainer = detection.articleContainer;

    this.extractionResult = extractArticleContent(this.articleContainer);

    if (this.extractionResult.totalWords === 0) {
      return;
    }

    this.timingController.setWords(this.extractionResult.words, this.extractionResult.paragraphStartIndices);
    this.scrollController.setArticleContainer(this.articleContainer);

    this.overlay.create();
    this.overlay.setTitleDisplay(this.settings.titleDisplay);
    this.overlay.setHeadingDisplay(this.settings.headingDisplay);
    this.overlay.setSurroundingWords(this.settings.surroundingWords);
    if (this.extractionResult.articleTitle) {
      this.overlay.setTitle(this.extractionResult.articleTitle);
    }
    const overlayElement = this.overlay.getElement();
    if (overlayElement) {
      this.controls.create(overlayElement);
      this.wpmSlider.create(overlayElement.querySelector('#speedsubstack-controls')!);
    }

    // Store close button handler for cleanup
    const closeButton = this.overlay.getCloseButton();
    if (closeButton) {
      this.boundCloseHandler = () => this.closeReader();
      closeButton.addEventListener('click', this.boundCloseHandler);
    }


    cleanupOldProgress();

    const progress = await loadProgress(window.location.href);
    const hasProgress = !!(progress && progress.paragraphStartIndex > 0);
    
    // Always show initial word/highlight (even at index 0)
    const startIndex = hasProgress ? progress.paragraphStartIndex : 0;
    this.timingController.setIndex(startIndex);

    // Enable keyboard handler globally after article detection
    this.keyboardHandler.enable();

    // Always create start button (needed for re-enabling reader after closing)
    this.startButton.create();
    this.startButton.setHasProgress(hasProgress);

    if (this.settings.activationMode === 'auto') {
      this.startReading();
    } else {
      this.startButton.show();
    }
  }

  private startReading(): void {
    this.startButton.hide();
    this.overlay.show();
    this.scrollController.enable();
    this.stateMachine.transition('paused');
    this.controls.setPlaying(false);
    this.scheduleAutoPlay(() => this.stateMachine.getState() === 'paused');
  }

  private showAndPlay(): void {
    if (this.stateMachine.getState() === 'idle') {
      this.startButton.hide();
      this.overlay.show();
      this.scrollController.enable();
      this.stateMachine.transition('paused');
      this.controls.setPlaying(false);
    } else {
      this.overlay.show();
      this.stateMachine.hideArticle();
    }
    this.scheduleAutoPlay(() => !this.timingController.getIsPlaying());
  }

  private scheduleAutoPlay(condition: () => boolean): void {
    const delayMs = this.settings.autostartDelay * 1000;
    if (delayMs === 0) {
      if (condition()) {
        this.resumePlayback();
      }
    } else {
      this.autoPlayTimer = window.setTimeout(() => {
        this.autoPlayTimer = null;
        if (condition()) {
          this.resumePlayback();
        }
      }, delayMs);
    }
  }

  private closeReader(): void {
    this.clearAllTimers();
    this.saveCurrentProgress();
    this.timingController.pause();
    this.stateMachine.stop();
    this.overlay.hide();
    this.scrollController.disable();

    // Always show start button when reader is closed (both manual and auto modes)
    this.startButton.show();
    // Show current word button since user has progress
    this.startButton.setHasProgress(true);
  }

  private disableExtension(): void {
    this.clearAllTimers();
    this.saveCurrentProgress();
    this.timingController.pause();
    this.stateMachine.stop();

    // Hide all UI
    this.overlay.hide();
    this.startButton.hide();
    this.highlighter.clear();
    this.scrollController.disable();
    this.keyboardHandler.disable();
  }

  private enableExtension(): void {
    // Only enable if we have article content
    if (!this.extractionResult) {
      return;
    }

    // Re-enable keyboard handler
    this.keyboardHandler.enable();

    // Show appropriate UI based on activation mode
    if (this.settings.activationMode === 'auto') {
      this.startReading();
    } else {
      this.startButton.show();
    }
  }

  private goToCurrentWord(): void {
    this.highlighter.scrollToHighlight();
  }

  private togglePlayPause(): void {
    const isPlaying = this.timingController.getIsPlaying();

    if (isPlaying) {
      this.timingController.pause();
      this.stateMachine.pauseReading();
    } else {
      if (this.autoPlayTimer !== null) {
        clearTimeout(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
      if (this.navigationResumeTimer !== null) {
        clearTimeout(this.navigationResumeTimer);
        this.navigationResumeTimer = null;
        this.wasPlayingBeforeNavigation = false;
      }
      this.timingController.play();
      this.stateMachine.startReading();
    }

    this.controls.setPlaying(!isPlaying);
  }

  private handleWordChange(word: ExtractedWord, index: number): void {
    // Get surrounding words (before and after current)
    const prevWords: string[] = [];
    const nextWords: string[] = [];
    if (this.extractionResult && this.settings.surroundingWords > 0) {
      for (let i = 1; i <= this.settings.surroundingWords; i++) {
        const prev = this.extractionResult.words[index - i];
        if (prev) {
          prevWords.unshift(prev.word);
        }
        const next = this.extractionResult.words[index + i];
        if (next) {
          nextWords.push(next.word);
        }
      }
    }
    
    this.overlay.displayWord(word.word, prevWords, nextWords);
    this.overlay.setHeading(word.currentHeading);
    this.highlighter.highlight(word);
    // Auto-scroll article to current word while overlay is visible
    if (this.overlay.isVisible()) {
      this.highlighter.scrollToHighlight();
    }
  }

  private handleComplete(): void {
    this.stateMachine.pauseReading();
    this.controls.setPlaying(false);
  }

  private handleProgress(current: number, total: number): void {
    this.controls.setProgress(current, total);
  }

  private handleSeek(progress: number): void {
    this.timingController.seekToProgress(progress);
  }

  private handleWpmChange(wpm: number): void {
    this.timingController.setWpm(wpm);
  }

  private navigateParagraph(direction: 'forward' | 'backward'): void {
    if (!this.extractionResult) return;

    const isCurrentlyPlaying = this.timingController.getIsPlaying();
    if (this.navigationResumeTimer === null) {
      this.wasPlayingBeforeNavigation = isCurrentlyPlaying;
    }

    if (this.navigationResumeTimer !== null) {
      clearTimeout(this.navigationResumeTimer);
      this.navigationResumeTimer = null;
    }

    if (isCurrentlyPlaying) {
      this.timingController.pause();
      this.stateMachine.pauseReading();
      this.controls.setPlaying(false);
    }

    const currentIndex = this.timingController.getIndex();
    const newIndex = direction === 'forward'
      ? findNextParagraphIndex(currentIndex, this.extractionResult.paragraphStartIndices)
      : findPreviousParagraphIndex(currentIndex, this.extractionResult.paragraphStartIndices);
    this.timingController.setIndex(newIndex);
    this.highlighter.scrollToHighlight();

    if (this.wasPlayingBeforeNavigation) {
      this.scheduleDelayedResume();
    }
  }

  private scheduleDelayedResume(): void {
    const delayMs = this.settings.autostartDelay * 1000;
    if (delayMs === 0) {
      this.resumePlayback();
      this.wasPlayingBeforeNavigation = false;
    } else {
      this.navigationResumeTimer = window.setTimeout(() => {
        this.navigationResumeTimer = null;
        this.resumePlayback();
        this.wasPlayingBeforeNavigation = false;
      }, delayMs);
    }
  }

  private resumePlayback(): void {
    this.timingController.play();
    this.stateMachine.startReading();
    this.controls.setPlaying(true);
  }

  private handleRewind(): void {
    this.navigateParagraph('backward');
  }

  private handleForward(): void {
    this.navigateParagraph('forward');
  }

  private handleScrollToArticle(): void {
    this.timingController.pause();
    this.stateMachine.showArticle();
    this.overlay.hide();
    this.highlighter.scrollToHighlight();
  }

  private handleScrollToReader(): void {
    this.overlay.show();
    this.stateMachine.hideArticle();
    this.timingController.play();
  }

  private handleStateChange({ to }: { from: ReaderState; to: ReaderState }): void {
    switch (to) {
      case 'reading':
        this.controls.setPlaying(true);
        break;
      case 'paused':
      case 'article-view':
        this.controls.setPlaying(false);
        break;
      case 'idle':
        this.controls.setPlaying(false);
        break;
    }
  }

  private applyThemeColor(color: string): void {
    // Create or update the theme style element
    if (!this.themeStyleElement) {
      this.themeStyleElement = document.createElement('style');
      this.themeStyleElement.id = 'speedsubstack-theme';
      document.head.appendChild(this.themeStyleElement);
    }

    // Calculate a slightly darker shade for hover states
    const darkerColor = this.adjustColorBrightness(color, -15);

    this.themeStyleElement.textContent = `
      :root {
        --substack-orange: ${color} !important;
        --substack-orange-hover: ${darkerColor} !important;
      }
    `;
  }

  private adjustColorBrightness(hex: string, percent: number): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    // Adjust brightness
    const adjust = (value: number) => {
      const adjusted = value + (value * percent / 100);
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };
    
    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);
    
    // Convert back to hex
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }

  private saveCurrentProgress(): void {
    if (!this.extractionResult) return;

    const currentIndex = this.timingController.getIndex();
    const paragraphStart = getParagraphStart(
      currentIndex,
      this.extractionResult.paragraphStartIndices
    );

    saveProgress(window.location.href, paragraphStart, currentIndex);
  }

  destroy(): void {
    this.clearAllTimers();
    this.saveCurrentProgress();
    this.unsubscribeSettings?.();
    
    // Remove close button listener
    const closeButton = this.overlay.getCloseButton();
    if (closeButton && this.boundCloseHandler) {
      closeButton.removeEventListener('click', this.boundCloseHandler);
    }
    
    
    // Remove lifecycle listeners
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (this.boundBeforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    }
    
    // Destroy components
    this.timingController.destroy();
    this.keyboardHandler.destroy();
    this.scrollController.destroy();
    this.overlay.destroy();
    this.controls.destroy();
    this.wpmSlider.destroy();
    this.startButton.destroy();
    this.highlighter.destroy();
    
    // Remove theme style element
    if (this.themeStyleElement && this.themeStyleElement.parentNode) {
      this.themeStyleElement.parentNode.removeChild(this.themeStyleElement);
    }
  }
}

const app = new SpeedSubstackApp();
app.init();
