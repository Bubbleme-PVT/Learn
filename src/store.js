
import { STORAGE_KEY, todayIso, clamp } from './utils.js';

const reviewOffsets = [1, 3, 7];
const defaultState = {
  theme: 'dark',
  page: 'overview',
  category: 'all',
  search: '',
  roadmapSearch: '',
  resourceTab: 'beginner',
  activeTopicId: null,
  activeTopicTab: 'concepts',
  sidebarOpen: false,
  filters: {
    level: 'all',
    bookmarksOnly: false,
    incompleteOnly: false
  },
  completed: {},
  bookmarks: {},
  notes: {},
  quizScores: {},
  dailyGoal: 2,
  activityLog: [],
  visitDates: [],
  lastVisit: null
};

let state = loadState();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const listeners = new Set();

function notify() {
  saveState();
  listeners.forEach(listener => listener(state));
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      ...defaultState,
      ...stored,
      filters: { ...defaultState.filters, ...(stored?.filters || {}) },
      completed: stored?.completed || {},
      bookmarks: stored?.bookmarks || {},
      notes: stored?.notes || {},
      quizScores: stored?.quizScores || {},
      activityLog: stored?.activityLog || [],
      visitDates: stored?.visitDates || []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function logActivity(type, topicId = null, meta = {}) {
  state.activityLog = [
    { type, topicId, meta, at: new Date().toISOString() },
    ...(state.activityLog || [])
  ].slice(0, 60);
}

export function recordVisit() {
  const today = todayIso();
  if (state.lastVisit !== today) {
    state.lastVisit = today;
    state.visitDates = Array.from(new Set([...(state.visitDates || []), today])).sort();
    logActivity('visit');
    notify();
  }
}

export function setPage(page) {
  state.page = page;
  state.sidebarOpen = false;
  notify();
}

export function setSearch(value) {
  state.search = value;
  notify();
}

export function setRoadmapSearch(value) {
  state.roadmapSearch = value;
  notify();
}

export function setCategory(category) {
  state.category = category;
  notify();
}

export function setLevel(level) {
  state.filters.level = level;
  notify();
}

export function toggleBookmarksOnly() {
  state.filters.bookmarksOnly = !state.filters.bookmarksOnly;
  notify();
}

export function toggleIncompleteOnly() {
  state.filters.incompleteOnly = !state.filters.incompleteOnly;
  notify();
}

export function setResourceTab(tab) {
  state.resourceTab = tab;
  notify();
}

export function openTopic(topicId, tab = 'concepts') {
  state.activeTopicId = Number(topicId);
  state.activeTopicTab = tab;
  notify();
}

export function closeTopic() {
  state.activeTopicId = null;
  notify();
}

export function setTopicTab(tab) {
  state.activeTopicTab = tab;
  notify();
}

export function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  notify();
}

export function setSidebarOpen(isOpen) {
  state.sidebarOpen = isOpen;
  notify();
}

export function toggleComplete(topicId) {
  const key = String(topicId);
  if (state.completed[key]) {
    delete state.completed[key];
    logActivity('uncomplete', topicId);
  } else {
    const completedAt = todayIso();
    state.completed[key] = {
      completedAt,
      reviewStage: 0,
      nextReviewDate: shiftDate(completedAt, reviewOffsets[0])
    };
    logActivity('complete', topicId);
  }
  notify();
}

export function markReviewDone(topicId) {
  const key = String(topicId);
  const current = state.completed[key];
  if (!current) return;
  const nextStage = clamp((current.reviewStage || 0) + 1, 0, reviewOffsets.length);
  state.completed[key] = {
    ...current,
    reviewStage: nextStage,
    nextReviewDate: nextStage >= reviewOffsets.length ? null : shiftDate(todayIso(), reviewOffsets[nextStage])
  };
  logActivity('review', topicId, { stage: nextStage });
  notify();
}

export function toggleBookmark(topicId) {
  const key = String(topicId);
  state.bookmarks[key] = !state.bookmarks[key];
  if (!state.bookmarks[key]) delete state.bookmarks[key];
  logActivity(state.bookmarks[key] ? 'bookmark' : 'unbookmark', topicId);
  notify();
}

export function saveNote(topicId, text) {
  const key = String(topicId);
  const clean = text.trim();
  if (clean) {
    state.notes[key] = clean;
  } else {
    delete state.notes[key];
  }
  logActivity('note', topicId);
  notify();
}

export function saveQuizResult(topicId, correctCount, totalCount) {
  const key = String(topicId);
  state.quizScores[key] = {
    correctCount,
    totalCount,
    updatedAt: new Date().toISOString()
  };
  logActivity('quiz', topicId, { correctCount, totalCount });
  notify();
}

export function setDailyGoal(value) {
  state.dailyGoal = clamp(Number(value) || 1, 1, 12);
  notify();
}

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function importState(parsed) {
  state = {
    ...defaultState,
    ...parsed,
    filters: { ...defaultState.filters, ...(parsed?.filters || {}) },
    completed: parsed?.completed || {},
    bookmarks: parsed?.bookmarks || {},
    notes: parsed?.notes || {},
    quizScores: parsed?.quizScores || {},
    activityLog: parsed?.activityLog || [],
    visitDates: parsed?.visitDates || []
  };
  notify();
}

function shiftDate(dateString, offsetDays) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
