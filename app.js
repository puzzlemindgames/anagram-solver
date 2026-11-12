/**
 * AnagramCraft - Advanced Anagram Solver & Scramble Word Finder
 * Fast frequency-counting solver with wildcard tile support
 */

(function () {
  "use strict";

  // Scrabble tile values
  const TILE_SCORES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
  };

  // Precomputed sample anagram scrambles
  const SAMPLES = [
    "RETAIN",
    "POINTERS",
    "EDUCATION",
    "STREAM",
    "TRIANGLE",
    "CREATIVE"
  ];

  // DOM Elements
  const lettersInput = document.getElementById("lettersInput");
  const tilePreview = document.getElementById("tilePreview");
  const solveBtn = document.getElementById("solveBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
  const filtersDrawer = document.getElementById("filtersDrawer");
  const filterStartsWith = document.getElementById("filterStartsWith");
  const filterEndsWith = document.getElementById("filterEndsWith");
  const filterContains = document.getElementById("filterContains");
  const filterExactLength = document.getElementById("filterExactLength");
  const alertBox = document.getElementById("alertBox");
  const resultsContainer = document.getElementById("resultsContainer");
  const statWords = document.getElementById("statWords");
  const statTopScore = document.getElementById("statTopScore");
  const statLongest = document.getElementById("statLongest");
  const lengthTabsContainer = document.getElementById("lengthTabsContainer");
  const resultsOutput = document.getElementById("resultsOutput");
  const sortSelect = document.getElementById("sortSelect");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const toastMsg = document.getElementById("toastMsg");

  // State
  let currentResults = [];
  let activeLengthFilter = "all";
  let activeSort = "score-desc";

  // Helper: Show toast notification
  function showToast(msg) {
    if (!toastMsg) return;
    toastMsg.textContent = msg;
    toastMsg.classList.add("show");
    setTimeout(() => {
      toastMsg.classList.remove("show");
    }, 2200);
  }

  // Helper: Show error alert
  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.style.display = "block";
  }

  // Helper: Clear alert
  function clearAlert() {
    alertBox.textContent = "";
    alertBox.style.display = "none";
  }

  // Update visual tiles as user types
  function updateTilePreview() {
    tilePreview.innerHTML = "";
    const val = (lettersInput.value || "").toUpperCase();
    if (!val) {
      tilePreview.innerHTML = '<span style="color:var(--text-faint); font-size:0.85rem;">Type letters above to preview Scrabble-style tiles...</span>';
      return;
    }

    for (let i = 0; i < val.length; i++) {
      const ch = val[i];
      const isBlank = (ch === "?" || ch === "*");
      const tile = document.createElement("div");
      tile.className = "letter-tile" + (isBlank ? " is-blank" : "");
      
      const charSpan = document.createElement("span");
      charSpan.textContent = isBlank ? "?" : ch;
      tile.appendChild(charSpan);

      if (!isBlank && TILE_SCORES[ch]) {
        const sub = document.createElement("span");
        sub.className = "tile-subscore";
        sub.textContent = TILE_SCORES[ch];
        tile.appendChild(sub);
      }

      tilePreview.appendChild(tile);
    }
  }

  // Calculate word score based on letter tile values
  function calculateScore(word) {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
      score += TILE_SCORES[word[i]] || 1;
    }
    return score;
  }

  // Main Solver Routine
  function runSolver() {
    clearAlert();

    const rawInput = (lettersInput.value || "").trim().toUpperCase();
    const cleanLetters = rawInput.replace(/[^A-Z?*]/g, "");

    if (!cleanLetters || cleanLetters.length < 2) {
      showAlert("Please enter at least 2 letters to unscramble words.");
      lettersInput.focus();
      return;
    }

    if (!window.SOLVER_WORDS || !Array.isArray(window.SOLVER_WORDS)) {
      showAlert("Dictionary lexicon is loading. Please wait a brief moment.");
      return;
    }

    // Advanced filter values
    const prefix = (filterStartsWith.value || "").trim().toLowerCase();
    const suffix = (filterEndsWith.value || "").trim().toLowerCase();
    const sub = (filterContains.value || "").trim().toLowerCase();
    const exactLen = parseInt(filterExactLength.value, 10);

    // Count available letters and wildcards
    const availableFreq = {};
    let wildcards = 0;

    for (let i = 0; i < cleanLetters.length; i++) {
      const ch = cleanLetters[i];
      if (ch === "?" || ch === "*") {
        wildcards++;
      } else {
        const low = ch.toLowerCase();
        availableFreq[low] = (availableFreq[low] || 0) + 1;
      }
    }

    const totalAllowedLength = cleanLetters.length;
    const words = window.SOLVER_WORDS;
    const matched = [];
    let topScore = 0;
    let longestWordLen = 0;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wLen = w.length;

      // Length bounds
      if (wLen < 3 || wLen > totalAllowedLength) continue;
      if (!isNaN(exactLen) && exactLen > 0 && wLen !== exactLen) continue;

      // Prefix, suffix, contains filters
      if (prefix && !w.startsWith(prefix)) continue;
      if (suffix && !w.endsWith(suffix)) continue;
      if (sub && !w.includes(sub)) continue;

      // Frequency check
      const wordFreq = {};
      for (let j = 0; j < wLen; j++) {
        const c = w[j];
        wordFreq[c] = (wordFreq[c] || 0) + 1;
      }

      let neededWildcards = 0;
      let possible = true;

      for (const char in wordFreq) {
        const count = wordFreq[char];
        const avail = availableFreq[char] || 0;
        if (count > avail) {
          neededWildcards += (count - avail);
          if (neededWildcards > wildcards) {
            possible = false;
            break;
          }
        }
      }

      if (possible) {
        const upperWord = w.toUpperCase();
        const score = calculateScore(upperWord);
        const isFullAnagram = (wLen === totalAllowedLength && wildcards === 0);

        if (score > topScore) topScore = score;
        if (wLen > longestWordLen) longestWordLen = wLen;

        matched.push({
          word: upperWord,
          length: wLen,
          score: score,
          isFullAnagram: isFullAnagram
        });
      }
    }

    currentResults = matched;

    // Update stats
    statWords.textContent = matched.length;
    statTopScore.textContent = topScore + " pts";
    statLongest.textContent = longestWordLen + " letters";

    buildLengthTabs();
    renderResults();
    resultsContainer.style.display = "block";
    resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Build Length Filter Tabs Dynamically
  function buildLengthTabs() {
    lengthTabsContainer.innerHTML = "";

    const lengths = [...new Set(currentResults.map(item => item.length))].sort((a, b) => b - a);
    
    // "All" tab
    const allTab = document.createElement("button");
    allTab.type = "button";
    allTab.className = "length-tab" + (activeLengthFilter === "all" ? " active" : "");
    allTab.textContent = `All (${currentResults.length})`;
    allTab.addEventListener("click", () => {
      activeLengthFilter = "all";
      updateTabActiveStates();
      renderResults();
    });
    lengthTabsContainer.appendChild(allTab);

    // Individual length tabs
    lengths.forEach(len => {
      const count = currentResults.filter(item => item.length === len).length;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "length-tab" + (activeLengthFilter === String(len) ? " active" : "");
      tab.textContent = `${len} Letters (${count})`;
      tab.addEventListener("click", () => {
        activeLengthFilter = String(len);
        updateTabActiveStates();
        renderResults();
      });
      lengthTabsContainer.appendChild(tab);
    });
  }

  function updateTabActiveStates() {
    const tabs = lengthTabsContainer.querySelectorAll(".length-tab");
    tabs.forEach(tab => {
      const isAll = tab.textContent.startsWith("All");
      if (activeLengthFilter === "all" && isAll) {
        tab.classList.add("active");
      } else if (tab.textContent.startsWith(activeLengthFilter + " ")) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
  }

  // Render Grouped Results
  function renderResults() {
    resultsOutput.innerHTML = "";

    let filtered = currentResults;
    if (activeLengthFilter !== "all") {
      const targetLen = parseInt(activeLengthFilter, 10);
      filtered = currentResults.filter(item => item.length === targetLen);
    }

    if (filtered.length === 0) {
      resultsOutput.innerHTML = `
        <div class="no-results-box">
          <div class="no-results-icon">🔍</div>
          <p><strong>No words found matching your letters or filters.</strong></p>
          <p style="font-size:0.9rem; margin-top:0.35rem;">Try adding wildcards (? or *) or removing prefix and suffix restrictions.</p>
        </div>
      `;
      return;
    }

    // Group by word length descending
    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.length]) grouped[item.length] = [];
      grouped[item.length].push(item);
    });

    const sortedLengths = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    sortedLengths.forEach(len => {
      const wordsInGroup = grouped[len];

      // Sort words within group
      wordsInGroup.sort((a, b) => {
        if (activeSort === "score-desc") {
          return b.score - a.score || a.word.localeCompare(b.word);
        }
        if (activeSort === "alpha") {
          return a.word.localeCompare(b.word);
        }
        return b.score - a.score;
      });

      const section = document.createElement("div");
      section.className = "length-group-section";

      const heading = document.createElement("div");
      heading.className = "group-heading";
      heading.innerHTML = `
        <span>${len}-Letter Words</span>
        <span class="group-badge">${wordsInGroup.length} words</span>
      `;
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "words-grid";

      wordsInGroup.forEach(item => {
        const card = document.createElement("div");
        card.className = "word-pill" + (item.isFullAnagram ? " is-bingo" : "");
        card.title = `${item.word} · ${item.score} pts · Click to copy`;

        const bingoStar = item.isFullAnagram ? '★ ' : '';
        card.innerHTML = `
          <span class="word-text">${bingoStar}${item.word}</span>
          <span class="word-points">${item.score} pt${item.score === 1 ? '' : 's'}</span>
        `;

        card.addEventListener("click", () => {
          navigator.clipboard.writeText(item.word).then(() => {
            showToast("Copied " + item.word + " to clipboard");
          });
        });

        grid.appendChild(card);
      });

      section.appendChild(grid);
      resultsOutput.appendChild(section);
    });
  }

  // Copy All Current Words
  copyAllBtn.addEventListener("click", () => {
    if (!currentResults || currentResults.length === 0) return;
    let list = currentResults;
    if (activeLengthFilter !== "all") {
      const targetLen = parseInt(activeLengthFilter, 10);
      list = currentResults.filter(item => item.length === targetLen);
    }
    const text = list.map(item => item.word).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied " + list.length + " words to clipboard");
    });
  });

  // Sort change listener
  sortSelect.addEventListener("change", function () {
    activeSort = this.value;
    renderResults();
  });

  // Toggle Advanced Filters
  toggleFiltersBtn.addEventListener("click", () => {
    const isHidden = (filtersDrawer.style.display === "none" || !filtersDrawer.style.display);
    filtersDrawer.style.display = isHidden ? "grid" : "none";
    toggleFiltersBtn.textContent = isHidden ? "▲ Hide Advanced Filters" : "▼ Show Advanced Filters";
  });

  // Clear Button
  clearBtn.addEventListener("click", () => {
    lettersInput.value = "";
    filterStartsWith.value = "";
    filterEndsWith.value = "";
    filterContains.value = "";
    filterExactLength.value = "";
    currentResults = [];
    resultsContainer.style.display = "none";
    clearAlert();
    updateTilePreview();
    lettersInput.focus();
  });

  // Sample Scramble
  sampleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    lettersInput.value = pick;
    updateTilePreview();
    runSolver();
  });

  // Event Listeners
  lettersInput.addEventListener("input", () => {
    clearAlert();
    updateTilePreview();
  });

  lettersInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runSolver();
    }
  });

  solveBtn.addEventListener("click", runSolver);

  // Initialize
  updateTilePreview();
})();
