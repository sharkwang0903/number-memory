(function () {
  'use strict';

  const STARTING_DIGITS = 4;
  const BLANK_DELAY_MS = 500;

  const state = {
    phase: 'home',
    digits: STARTING_DIGITS,
    attempts: 0,
    targetNumber: '',
    input: '',
    maxSuccess: 0,
    lastResult: null,
    timerId: null,
    roundToken: 0
  };

  let onStateChange = function () {};

  function cloneState() {
    return {
      phase: state.phase,
      digits: state.digits,
      attempts: state.attempts,
      targetNumber: state.targetNumber,
      input: state.input,
      maxSuccess: state.maxSuccess,
      lastResult: state.lastResult
    };
  }

  function notify() {
    onStateChange(cloneState());
  }

  function clearRoundTimer() {
    if (state.timerId !== null) {
      window.clearTimeout(state.timerId);
      state.timerId = null;
    }
    state.roundToken += 1;
  }

  function setPhase(phase) {
    state.phase = phase;
    notify();
  }

  function initializeGame(changeHandler) {
    clearRoundTimer();
    onStateChange = typeof changeHandler === 'function' ? changeHandler : function () {};
    state.phase = 'home';
    state.digits = STARTING_DIGITS;
    state.attempts = 0;
    state.targetNumber = '';
    state.input = '';
    state.maxSuccess = 0;
    state.lastResult = null;
    notify();
  }

  function startNewGame() {
    clearRoundTimer();
    state.phase = 'prepare';
    state.digits = STARTING_DIGITS;
    state.attempts = 0;
    state.targetNumber = '';
    state.input = '';
    state.maxSuccess = 0;
    state.lastResult = null;
    notify();
  }

  function prepareNextRound() {
    if (state.phase !== 'success') {
      return;
    }

    clearRoundTimer();
    state.phase = 'prepare';
    state.targetNumber = '';
    state.input = '';
    state.lastResult = null;
    notify();
  }

  function generateRandomNumber(digits) {
    let number = String(Math.floor(Math.random() * 9) + 1);

    for (let index = 1; index < digits; index += 1) {
      number += String(Math.floor(Math.random() * 10));
    }

    return number;
  }

  function calculateDisplayTime(digits) {
    return Math.min(2.5, Math.max(1.0, 0.25 * digits));
  }

  function beginRound() {
    if (state.phase !== 'prepare' && state.phase !== 'retry') {
      return;
    }

    clearRoundTimer();
    state.targetNumber = generateRandomNumber(state.digits);
    state.input = '';
    state.lastResult = null;
    const currentToken = state.roundToken;

    setPhase('blank');

    state.timerId = window.setTimeout(function () {
      if (currentToken !== state.roundToken) return;
      showNumber(currentToken);
    }, BLANK_DELAY_MS);
  }

  function showNumber(currentToken) {
    if (currentToken !== state.roundToken) return;

    state.timerId = null;
    setPhase('showing');
    const displayTimeMs = calculateDisplayTime(state.digits) * 1000;

    state.timerId = window.setTimeout(function () {
      if (currentToken !== state.roundToken) return;
      state.input = '';
      state.timerId = null;
      setPhase('answer');
    }, displayTimeMs);
  }

  function addInputDigit(digit) {
    if (state.phase !== 'answer' || !/^[0-9]$/.test(String(digit))) {
      return false;
    }

    if (state.input.length >= state.digits) {
      return false;
    }

    state.input += String(digit);
    notify();
    return true;
  }

  function deleteInput() {
    if (state.phase !== 'answer' || state.input.length === 0) {
      return false;
    }

    state.input = state.input.slice(0, -1);
    notify();
    return true;
  }

  function submitAnswer() {
    if (state.phase !== 'answer') {
      return { type: 'ignored' };
    }

    if (state.input.length === 0) {
      return { type: 'empty' };
    }

    const isCorrect = judgeAnswer(state.input, state.targetNumber);
    if (isCorrect) {
      handleSuccess();
      return { type: 'success' };
    }

    state.attempts += 1;
    if (state.attempts < 2) {
      handleFirstFailure();
      return { type: 'retry' };
    }

    endGame();
    return { type: 'game-over' };
  }

  function judgeAnswer(input, target) {
    return String(input) === String(target);
  }

  function handleFirstFailure() {
    state.input = '';
    state.targetNumber = '';
    state.lastResult = 'first-failure';
    setPhase('retry');
  }

  function handleSuccess() {
    const passedDigits = state.digits;
    state.maxSuccess = Math.max(state.maxSuccess, passedDigits);
    state.digits += 1;
    state.attempts = 0;
    state.input = '';
    state.targetNumber = '';
    state.lastResult = 'success';
    setPhase('success');
  }

  function endGame() {
    clearRoundTimer();
    state.input = '';
    state.targetNumber = '';
    state.lastResult = 'game-over';
    setPhase('result');
  }

  function getTitle(maxSuccess) {
    if (maxSuccess >= 14) {
      return { name: '過目不忘之人', quote: '你真的有忘記過東西嗎？' };
    }
    if (maxSuccess >= 11) {
      return { name: '記憶超越者', quote: '這已經不是普通人的記憶力了。' };
    }
    if (maxSuccess >= 9) {
      return { name: '記憶支配者', quote: '數字正在你的腦中排隊。' };
    }
    if (maxSuccess >= 6) {
      return { name: '記憶覺醒者', quote: '你的腦袋開始進入狀態了。' };
    }
    if (maxSuccess >= 4) {
      return { name: '記憶見習生', quote: '旅程才正要開始。' };
    }
    return { name: '記憶旅人', quote: '先記住第一步，下一次會更熟悉。' };
  }

  function getState() {
    return cloneState();
  }

  window.MemoryGame = {
    initializeGame: initializeGame,
    startNewGame: startNewGame,
    prepareNextRound: prepareNextRound,
    beginRound: beginRound,
    generateRandomNumber: generateRandomNumber,
    calculateDisplayTime: calculateDisplayTime,
    showNumber: showNumber,
    addInputDigit: addInputDigit,
    deleteInput: deleteInput,
    submitAnswer: submitAnswer,
    judgeAnswer: judgeAnswer,
    handleFirstFailure: handleFirstFailure,
    handleSuccess: handleSuccess,
    endGame: endGame,
    getTitle: getTitle,
    getState: getState
  };
})();
