(function () {
  'use strict';

  const STORAGE_KEY = 'number-memory-personal-best';

  function readBestScore() {
    try {
      const savedScore = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(savedScore) && savedScore >= 0 ? savedScore : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestScore(score) {
    const safeScore = Math.max(0, Number.parseInt(score, 10) || 0);

    try {
      localStorage.setItem(STORAGE_KEY, String(safeScore));
    } catch (error) {
      // 若瀏覽器禁止 localStorage，遊戲仍可正常遊玩。
    }

    return safeScore;
  }

  function updateBestScore(score) {
    const previousBest = readBestScore();
    const safeScore = Math.max(0, Number.parseInt(score, 10) || 0);
    const isNewRecord = safeScore > previousBest;

    if (isNewRecord) {
      saveBestScore(safeScore);
    }

    return {
      bestScore: Math.max(previousBest, safeScore),
      isNewRecord: isNewRecord
    };
  }

  window.MemoryStorage = {
    readBestScore: readBestScore,
    saveBestScore: saveBestScore,
    updateBestScore: updateBestScore
  };
})();
