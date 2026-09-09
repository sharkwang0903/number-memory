(function () {
  'use strict';

  const screens = document.querySelectorAll('[data-screen]');
  let bestAtGameStart = 0;

  function getBinding(name) {
    return document.querySelector('[data-bind="' + name + '"]');
  }

  function setBinding(name, value) {
    const element = getBinding(name);
    if (element) element.textContent = value;
  }

  function switchScreen(phase) {
    screens.forEach(function (screen) {
      const isVisible = screen.dataset.screen === phase;
      screen.hidden = !isVisible;
      screen.classList.toggle('is-active', isVisible);
    });
  }

  function renderAnswer(state) {
    const display = state.input.padEnd(state.digits, '_');
    setBinding('answer-display', display);
    setBinding('input-feedback', '');
  }

  function renderState(state) {
    switchScreen(state.phase);

    if (state.phase === 'prepare') {
      setBinding('digits', state.digits);
    }

    if (state.phase === 'showing') {
      setBinding('target-number', state.targetNumber);
    }

    if (state.phase === 'answer') {
      renderAnswer(state);
    }

    if (state.phase === 'success') {
      setBinding('passed-digits', state.digits - 1);
      setBinding('next-digits', state.digits);
    }

    if (state.phase === 'retry') {
      setBinding('retry-digits', state.digits);
    }

    if (state.phase === 'result') {
      renderResult(state);
    }
  }

  function renderResult(state) {
    const record = saveResultRecord(state.maxSuccess);

    setBinding('final-score', state.maxSuccess);
    setBinding('personal-best', record.bestScore);
    const title = MemoryGame.getTitle(state.maxSuccess);
    setBinding('memory-title', title.name);
    setBinding('title-quote', title.quote);

    const badge = getBinding('record-badge');
    if (badge) badge.hidden = !(state.maxSuccess > bestAtGameStart);
  }

  function saveResultRecord(score) {
    return MemoryStorage.updateBestScore(score);
  }

  function handleAction(action) {
    if (action === 'start-game' || action === 'restart-game') {
      bestAtGameStart = MemoryStorage.readBestScore();
      MemoryGame.startNewGame();
      return;
    }

    if (action === 'ready' || action === 'retry-round') {
      MemoryGame.beginRound();
      return;
    }

    if (action === 'next-round') {
      MemoryGame.prepareNextRound();
      return;
    }

    if (action === 'back-home') {
      MemoryGame.initializeGame(renderState);
    }
  }

  function handleKey(key) {
    if (key === 'backspace') {
      MemoryGame.deleteInput();
      return;
    }

    if (key === 'enter') {
      submitCurrentAnswer();
      return;
    }

    MemoryGame.addInputDigit(key);
  }

  function submitCurrentAnswer() {
    const result = MemoryGame.submitAnswer();
    if (result.type === 'empty') {
      setBinding('input-feedback', '請先輸入答案。');
    }
  }

  function setupEvents() {
    document.addEventListener('click', function (event) {
      const actionButton = event.target.closest('[data-action]');
      if (actionButton) {
        handleAction(actionButton.dataset.action);
        return;
      }

      const keyButton = event.target.closest('[data-key]');
      if (keyButton) handleKey(keyButton.dataset.key);
    });

    document.addEventListener('keydown', function (event) {
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        handleKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handleKey('backspace');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleKey('enter');
      }
    });
  }

  function startUI() {
    // 觸碰虛擬鍵盤時不讓頁面因瀏覽器預設行為產生位移。
    document.querySelector('.keypad').addEventListener('touchstart', function () {}, { passive: true });
    setupEvents();
    MemoryGame.initializeGame(renderState);
  }

  startUI();
})();
