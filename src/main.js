
import { loadAllData } from './data-loader.js';
import {
  getState,
  subscribe,
  recordVisit,
  setPage,
  setSearch,
  setRoadmapSearch,
  setCategory,
  setLevel,
  toggleBookmarksOnly,
  toggleIncompleteOnly,
  setResourceTab,
  openTopic,
  closeTopic,
  setTopicTab,
  toggleTheme,
  setSidebarOpen,
  toggleComplete,
  markReviewDone,
  toggleBookmark,
  saveNote,
  saveQuizResult,
  setDailyGoal,
  exportState,
  importState
} from './store.js';
import { renderApp } from './render.js';
import { downloadTextFile, parseTopicHash, qs, qsa, slugToHash, todayIso } from './utils.js';

const refs = {
  sidebar: qs('#sidebar'),
  sidebarBackdrop: qs('#sidebarBackdrop'),
  detailPanel: qs('#detailPanel'),
  overview: qs('#page-overview'),
  topics: qs('#page-topics'),
  roadmap: qs('#page-roadmap'),
  resources: qs('#page-resources'),
  planner: qs('#page-planner'),
  analytics: qs('#page-analytics'),
  glossary: qs('#page-glossary'),
  headerProgressText: qs('#headerProgressText'),
  headerStreakText: qs('#headerStreakText'),
  topicCountPill: qs('#topicCountPill'),
  globalSearchInput: qs('#globalSearchInput'),
  themeToggleBtn: qs('#themeToggleBtn'),
  sidebarToggleBtn: qs('#sidebarToggleBtn'),
  exportProgressBtn: qs('#exportProgressBtn'),
  importProgressInput: qs('#importProgressInput'),
  downloadCertificateBtn: qs('#downloadCertificateBtn'),
  toastStack: qs('#toastStack'),
  scrollProgressFill: qs('#scrollProgressFill')
};

let data = null;

init().catch(error => {
  console.error(error);
  showToast('App failed to load', error.message || 'Unknown error', 'error');
});

async function init() {
  data = await loadAllData();
  recordVisit();
  subscribe(render);
  wireBaseEvents();
  handleHashOnLoad();
  render(getState());
}

function render() {
  const state = getState();
  refs.globalSearchInput.value = state.search;
  refs.themeToggleBtn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  renderApp(data, state, refs);
  updateScrollProgress();
}

function wireBaseEvents() {
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('hashchange', () => {
    const slug = parseTopicHash();
    if (!slug || !data) return;
    const topic = data.topics.find(item => item.slug === slug);
    if (topic) {
      setPage('topics');
      openTopic(topic.id, 'concepts');
    }
  });

  refs.globalSearchInput.addEventListener('input', event => {
    setSearch(event.target.value);
    if (event.target.value.trim()) setPage('topics');
  });

  refs.themeToggleBtn.addEventListener('click', () => toggleTheme());
  refs.sidebarToggleBtn.addEventListener('click', () => setSidebarOpen(!getState().sidebarOpen));
  refs.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

  refs.exportProgressBtn.addEventListener('click', () => {
    downloadTextFile(`shopify-mastery-progress-${todayIso()}.json`, exportState());
    showToast('Progress exported', 'A JSON backup of your local learning state has been downloaded.', 'success');
  });

  refs.importProgressInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      importState(parsed);
      showToast('Progress imported', 'Your local state has been replaced from the JSON backup.', 'success');
    } catch (error) {
      showToast('Import failed', 'The selected file was not valid JSON.', 'error');
    } finally {
      refs.importProgressInput.value = '';
    }
  });

  refs.downloadCertificateBtn.addEventListener('click', () => {
    const state = getState();
    const completedCount = Object.keys(state.completed).length;
    if (completedCount !== data.topics.length) {
      showToast('Certificate locked', 'Complete the full curriculum first to unlock the certificate download.', 'error');
      return;
    }
    const certificate = buildCertificate();
    downloadTextFile('shopify-mastery-certificate.html', certificate, 'text/html');
    showToast('Certificate downloaded', 'Your local completion certificate has been generated.', 'success');
  });

  document.addEventListener('click', handleDelegatedClick);
  document.addEventListener('input', handleDelegatedInput);
}

function handleHashOnLoad() {
  const slug = parseTopicHash();
  if (!slug || !data) return;
  const topic = data.topics.find(item => item.slug === slug);
  if (topic) {
    setPage('topics');
    openTopic(topic.id, 'concepts');
  }
}

function handleDelegatedClick(event) {
  const navButton = event.target.closest('[data-nav-page]');
  if (navButton) {
    setPage(navButton.dataset.navPage);
    return;
  }

  const pageJump = event.target.closest('[data-go-page]');
  if (pageJump) {
    setPage(pageJump.dataset.goPage);
    return;
  }

  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) {
    setCategory(categoryButton.dataset.category);
    setPage('topics');
    return;
  }

  const resourceTab = event.target.closest('[data-resource-tab]');
  if (resourceTab) {
    setResourceTab(resourceTab.dataset.resourceTab);
    return;
  }

  const openTopicButton = event.target.closest('[data-open-topic]');
  if (openTopicButton) {
    const id = Number(openTopicButton.dataset.openTopic);
    const topic = data.topics.find(item => item.id === id);
    if (!topic) return;
    if (window.location.hash !== slugToHash(topic.slug)) {
      history.replaceState(null, '', slugToHash(topic.slug));
    }
    openTopic(id, 'concepts');
    return;
  }

  const closeTopicButton = event.target.closest('[data-close-topic]');
  if (closeTopicButton) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    closeTopic();
    return;
  }

  const topicTabButton = event.target.closest('[data-topic-tab]');
  if (topicTabButton) {
    setTopicTab(topicTabButton.dataset.topicTab);
    return;
  }

  const completeButton = event.target.closest('[data-toggle-complete]');
  if (completeButton) {
    const id = Number(completeButton.dataset.toggleComplete);
    const wasDone = Boolean(getState().completed[String(id)]);
    toggleComplete(id);
    showToast(
      wasDone ? 'Completion removed' : 'Topic completed',
      wasDone ? 'The topic was moved back to in-progress state.' : 'Progress saved locally and added to your review queue.',
      'success'
    );
    return;
  }

  const reviewDoneButton = event.target.closest('[data-review-done]');
  if (reviewDoneButton) {
    markReviewDone(Number(reviewDoneButton.dataset.reviewDone));
    showToast('Review recorded', 'The next review date has been updated.', 'success');
    return;
  }

  const bookmarkButton = event.target.closest('[data-toggle-bookmark]');
  if (bookmarkButton) {
    const id = Number(bookmarkButton.dataset.toggleBookmark);
    const wasBookmarked = Boolean(getState().bookmarks[String(id)]);
    toggleBookmark(id);
    showToast(
      wasBookmarked ? 'Bookmark removed' : 'Bookmark saved',
      wasBookmarked ? 'The topic was removed from your bookmarks.' : 'The topic is now saved for later review.',
      'success'
    );
    return;
  }

  const filterButton = event.target.closest('[data-toggle-filter]');
  if (filterButton) {
    if (filterButton.dataset.toggleFilter === 'bookmarks') toggleBookmarksOnly();
    if (filterButton.dataset.toggleFilter === 'incomplete') toggleIncompleteOnly();
    return;
  }

  const saveNoteButton = event.target.closest('[data-save-note]');
  if (saveNoteButton) {
    const id = Number(saveNoteButton.dataset.saveNote);
    const input = qs(`[data-note-input="${id}"]`);
    saveNote(id, input?.value || '');
    showToast('Note saved', 'Your private note was stored locally.', 'success');
    return;
  }

  const quizButton = event.target.closest('[data-submit-quiz]');
  if (quizButton) {
    const topicId = Number(quizButton.dataset.submitQuiz);
    gradeQuiz(topicId);
    return;
  }

  const copyButton = event.target.closest('[data-copy-code]');
  if (copyButton) {
    const topicId = Number(copyButton.dataset.copyCode);
    const topic = data.topics.find(item => item.id === topicId);
    if (!topic) return;
    navigator.clipboard.writeText(topic.code)
      .then(() => showToast('Code copied', 'The code example was copied to your clipboard.', 'success'))
      .catch(() => showToast('Copy failed', 'Clipboard access was unavailable in this browser.', 'error'));
    return;
  }

  const chapterButton = event.target.closest('[data-toggle-chapter]');
  if (chapterButton) {
    const body = chapterButton.parentElement;
    body.classList.toggle('is-open');
  }
}

function handleDelegatedInput(event) {
  if (event.target.id === 'topicSearchMirror') {
    setSearch(event.target.value);
    return;
  }
  if (event.target.id === 'roadmapSearchInput') {
    setRoadmapSearch(event.target.value);
    return;
  }
  if (event.target.id === 'levelSelect') {
    setLevel(event.target.value);
    return;
  }
  if (event.target.id === 'dailyGoalInput') {
    setDailyGoal(event.target.value);
    return;
  }
}

function gradeQuiz(topicId) {
  const topic = data.topics.find(item => item.id === topicId);
  if (!topic) return;
  let correct = 0;

  topic.quiz.forEach((question, index) => {
    const checked = qs(`input[name="quiz-${topicId}-${index}"]:checked`);
    const feedback = qs(`[data-quiz-feedback="${topicId}-${index}"]`);
    if (!feedback) return;
    if (!checked) {
      feedback.textContent = 'Select an answer before checking.';
      feedback.className = 'quiz-feedback is-error';
      return;
    }
    const selected = Number(checked.value);
    const isCorrect = selected === question.answer;
    if (isCorrect) correct += 1;
    feedback.textContent = `${isCorrect ? 'Correct.' : 'Not quite.'} ${question.explanation}`;
    feedback.className = `quiz-feedback ${isCorrect ? 'is-success' : 'is-error'}`;
  });

  saveQuizResult(topicId, correct, topic.quiz.length);
  showToast('Quiz checked', `You got ${correct} out of ${topic.quiz.length} correct.`, correct === topic.quiz.length ? 'success' : 'error');
}

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  refs.scrollProgressFill.style.width = `${pct}%`;
}

function showToast(title, message, variant = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
  refs.toastStack.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function buildCertificate() {
  const completedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shopify Mastery Certificate</title>
<style>
body{font-family:Inter,Arial,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f4f7fb;color:#102038}
.card{width:min(900px,92vw);border:8px solid #4f8cff;border-radius:24px;padding:56px;background:white;box-shadow:0 24px 80px rgba(16,32,56,.12)}
h1{font-size:48px;margin:0 0 10px;letter-spacing:-.04em}
p{font-size:18px;line-height:1.7;margin:14px 0}
.badge{display:inline-block;padding:8px 14px;border-radius:999px;background:#eef4ff;color:#2456c8;font-weight:700}
</style>
</head>
<body>
  <div class="card">
    <div class="badge">Shopify Mastery Platform</div>
    <h1>Certificate of Completion</h1>
    <p>This certifies that the learner has completed the full interactive curriculum covering Liquid, Sections, Metafields, Apps, APIs, JavaScript, Tools, Hydrogen, and professional Shopify delivery workflows.</p>
    <p><strong>Completed on:</strong> ${completedAt}</p>
    <p><strong>Curriculum size:</strong> ${data.topics.length} topics across ${data.chapters.length} chapters</p>
    <p>Generated locally from the modular Shopify Mastery Platform artifact.</p>
  </div>
</body>
</html>`;
}
