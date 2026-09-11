(function () {
  'use strict';

  const screens = document.querySelectorAll('[data-screen]');
  const RAPID_TAP_DELAY_MS = 350;
  const TAP_MOVE_TOLERANCE_PX = 12;
  const COMPAT_CLICK_GUARD_MS = 100;
  let bestAtGameStart = 0;
  let ignoreTrustedKeyClickUntil = 0;

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

  function findTouch(touchList, identifier) {
    for (let index = 0; index < touchList.length; index += 1) {
      if (touchList[index].identifier === identifier) {
        return touchList[index];
      }
    }
    return null;
  }

  function setupKeypadTouchFallback() {
    const keypad = document.querySelector('.keypad');
    let lastTapTime = 0;
    let touchStart = null;
    let hadMultipleTouches = false;

    function markMultipleTouches(event) {
      if (event.touches.length > 1) {
        hadMultipleTouches = true;
      }
    }

    function resetMultiTouchAfterGesture(event) {
      if (event.touches.length === 0) {
        hadMultipleTouches = false;
      }
    }

    document.addEventListener('touchstart', markMultipleTouches, { passive: true, capture: true });
    document.addEventListener('touchmove', markMultipleTouches, { passive: true, capture: true });
    document.addEventListener('touchend', resetMultiTouchAfterGesture, { passive: true });
    document.addEventListener('touchcancel', resetMultiTouchAfterGesture, { passive: true });

    keypad.addEventListener('touchstart', function (event) {
      const keyButton = event.target.closest('[data-key]');
      if (!keyButton || !keypad.contains(keyButton) || event.touches.length !== 1) {
        touchStart = null;
        return;
      }

      const touch = event.changedTouches[0];
      touchStart = {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        keyButton: keyButton,
        moved: false
      };
    }, { passive: true });

    keypad.addEventListener('touchmove', function (event) {
      if (!touchStart) return;

      if (event.touches.length > 1) {
        hadMultipleTouches = true;
        return;
      }

      const touch = findTouch(event.touches, touchStart.identifier);
      if (!touch) return;

      const movedX = Math.abs(touch.clientX - touchStart.x);
      const movedY = Math.abs(touch.clientY - touchStart.y);
      if (movedX > TAP_MOVE_TOLERANCE_PX || movedY > TAP_MOVE_TOLERANCE_PX) {
        touchStart.moved = true;
      }
    }, { passive: true });

    keypad.addEventListener('touchend', function (event) {
      if (!touchStart) return;

      const endedTouch = findTouch(event.changedTouches, touchStart.identifier);
      const keyButton = touchStart.keyButton;
      const isSingleTap = Boolean(
        endedTouch &&
        !touchStart.moved &&
        !hadMultipleTouches &&
        event.touches.length === 0
      );

      touchStart = null;
      if (!isSingleTap) {
        lastTapTime = 0;
        return;
      }

      const now = Date.now();
      const isRapidRepeat = now - lastTapTime > 0 && now - lastTapTime <= RAPID_TAP_DELAY_MS;
      lastTapTime = now;

      if (!isRapidRepeat) return;

      event.preventDefault();
      ignoreTrustedKeyClickUntil = now + COMPAT_CLICK_GUARD_MS;
      keyButton.click();
    }, { passive: false });

    keypad.addEventListener('touchcancel', function () {
      touchStart = null;
      lastTapTime = 0;
    }, { passive: true });
  }

  function setupEvents() {
    document.addEventListener('click', function (event) {
      const actionButton = event.target.closest('[data-action]');
      if (actionButton) {
        handleAction(actionButton.dataset.action);
        return;
      }

      const keyButton = event.target.closest('[data-key]');
      if (keyButton) {
        const isGuardedTouchClick = event.isTrusted && event.detail > 0 && Date.now() < ignoreTrustedKeyClickUntil;
        if (isGuardedTouchClick) {
          ignoreTrustedKeyClickUntil = 0;
          return;
        }
        handleKey(keyButton.dataset.key);
      }
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
    setupKeypadTouchFallback();
    setupEvents();
    MemoryGame.initializeGame(renderState);
  }

  startUI();
})();
