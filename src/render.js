
import { escapeHtml, formatPercent, formatDate, slugToHash, toTitleCase, todayIso } from './utils.js';

const CATEGORY_ORDER = ['liquid', 'sections', 'metafields', 'apps', 'apis', 'javascript', 'tools'];

export function renderApp(data, state, refs) {
  applyTheme(state.theme);
  applyPageState(state.page);
  applySidebar(state.sidebarOpen, refs);
  renderOverview(data, state, refs.overview);
  renderTopics(data, state, refs.topics);
  renderRoadmap(data, state, refs.roadmap);
  renderResources(data, state, refs.resources);
  renderPlanner(data, state, refs.planner);
  renderAnalytics(data, state, refs.analytics);
  renderGlossary(data, refs.glossary);
  renderDetailPanel(data, state, refs.detailPanel);
  renderHeaderStats(data, state, refs);
  syncFilterButtons(state);
  syncNavButtons(state);
  syncResourceTabs(state);
}

export function getDerived(data, state) {
  const topicById = new Map(data.topics.map(topic => [topic.id, topic]));
  const completedIds = new Set(Object.keys(state.completed).map(Number));
  const bookmarkedIds = new Set(Object.keys(state.bookmarks).filter(key => state.bookmarks[key]).map(Number));
  const completedCount = completedIds.size;
  const progressPct = data.topics.length ? (completedCount / data.topics.length) * 100 : 0;
  const dueReviews = data.topics.filter(topic => {
    const record = state.completed[String(topic.id)];
    return record?.nextReviewDate && record.nextReviewDate <= todayIso();
  });
  const streak = calculateStreak(state.visitDates || []);
  const categoryProgress = CATEGORY_ORDER.map(category => {
    const items = data.topics.filter(topic => topic.category === category);
    const done = items.filter(topic => completedIds.has(topic.id)).length;
    return {
      category,
      total: items.length,
      done,
      pct: items.length ? (done / items.length) * 100 : 0
    };
  });
  const dailyDone = state.activityLog.filter(item => item.type === 'complete' && item.at?.slice(0, 10) === todayIso()).length;
  const activeTopic = data.topics.find(topic => topic.id === state.activeTopicId) || null;
  return { topicById, completedIds, bookmarkedIds, completedCount, progressPct, dueReviews, streak, categoryProgress, dailyDone, activeTopic };
}

function renderOverview(data, state, root) {
  const derived = getDerived(data, state);
  root.innerHTML = `
    <div class="hero">
      <div class="hero__eyebrow">Interactive Shopify Academy</div>
      <h1>Master Shopify development with a professional learning dashboard.</h1>
      <p>
        Learn Liquid, themes, sections, metafields, apps, APIs, JavaScript, tooling, Hydrogen, and advanced delivery workflows.
        This version fixes the monolithic prototype by splitting content into JSON data and modular UI logic.
      </p>
      <div class="hero__actions">
        <button class="btn btn--primary" data-go-page="roadmap">Start the 12-chapter roadmap</button>
        <button class="btn btn--ghost" data-go-page="topics">Browse all topics</button>
        <button class="btn btn--ghost" data-go-page="resources">Open resources</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><strong>${data.chapters.length}</strong><span>Chapters</span></div>
        <div class="stat-card"><strong>${data.topics.length}</strong><span>Topics</span></div>
        <div class="stat-card"><strong>${Math.round(derived.progressPct)}%</strong><span>Completion</span></div>
        <div class="stat-card"><strong>${derived.streak}</strong><span>Day streak</span></div>
      </div>
    </div>

    <div class="section-head">
      <div>
        <h2>What this platform now fixes</h2>
        <p>It is no longer a giant hardcoded single-file prototype.</p>
      </div>
    </div>
    <div class="overview-grid">
      <div class="info-card">
        <h3>Architectural improvements</h3>
        <ul class="check-list">
          <li>Topics, chapters, glossary, projects, and resources now live in separate JSON files.</li>
          <li>UI logic lives in modular ES modules, so content edits do not require rewriting the whole application.</li>
          <li>Primary topic panel now uses the exact Concepts / Code / Videos flow you requested.</li>
          <li>Every topic has exactly two embedded videos and real progress tracking with local persistence.</li>
        </ul>
      </div>
      <div class="info-card">
        <h3>Learning engine highlights</h3>
        <ul class="list">
          <li><strong>Roadmap:</strong> 12 chapters with instant filtering and linked topic cards.</li>
          <li><strong>Interactive detail panel:</strong> concepts, code, videos, quizzes, notes, bookmarks, copy buttons.</li>
          <li><strong>Planner:</strong> daily goals, due reviews, capstone projects, certificate readiness.</li>
          <li><strong>Analytics:</strong> live category progress, quiz coverage, note count, and bookmark count.</li>
        </ul>
      </div>
    </div>

    <div class="section-head">
      <div>
        <h2>Capstone build ideas</h2>
        <p>Read → watch → practice with portfolio-worthy outcomes.</p>
      </div>
    </div>
    <div class="resource-grid">
      ${data.projects.map(project => `
        <article class="project-card">
          <div class="pill ${project.level.toLowerCase() === 'beginner' ? 'tools' : project.level.toLowerCase() === 'intermediate' ? 'javascript' : 'apis'}">${escapeHtml(project.level)}</div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.outcome)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderTopics(data, state, root) {
  const derived = getDerived(data, state);
  const topics = filterTopics(data.topics, state, derived);
  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Topic cards</h2>
        <p>Exact categories, persistent progress, bookmarks, notes, quizzes, and embedded videos.</p>
      </div>
      <div class="count-badge">${topics.length} matching topics</div>
    </div>

    <div class="toolbar">
      <div class="toolbar__left">
        <input class="input" id="topicSearchMirror" value="${escapeHtml(state.search)}" type="search" placeholder="Filter topics in real time..." />
        <select class="select" id="levelSelect">
          <option value="all" ${state.filters.level === 'all' ? 'selected' : ''}>All levels</option>
          <option value="Beginner" ${state.filters.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
          <option value="Intermediate" ${state.filters.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="Advanced" ${state.filters.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
        </select>
      </div>
      <div class="toolbar__right">
        <button class="chip ${state.filters.bookmarksOnly ? 'is-active' : ''}" data-toggle-filter="bookmarks">Bookmarks only</button>
        <button class="chip ${state.filters.incompleteOnly ? 'is-active' : ''}" data-toggle-filter="incomplete">Incomplete only</button>
      </div>
    </div>

    <div class="topics-grid">
      ${topics.length ? topics.map(topic => renderTopicCard(topic, state, derived)).join('') : renderEmpty('No topics matched these filters.', 'Try a different search, level, or category.')}
    </div>
  `;
}

function renderTopicCard(topic, state, derived) {
  const completed = derived.completedIds.has(topic.id);
  const bookmarked = derived.bookmarkedIds.has(topic.id);
  const quizScore = state.quizScores[String(topic.id)];
  return `
    <article class="topic-card" id="topic-card-${topic.id}">
      <div class="topic-card__top">
        <div class="topic-card__meta">
          <span class="pill ${topic.category}">${escapeHtml(topic.category)}</span>
          <span class="pill">${escapeHtml(topic.level)}</span>
        </div>
        <div class="topic-card__meta">
          ${bookmarked ? '<span class="pill tools">Bookmarked</span>' : ''}
          ${completed ? '<span class="pill tools">Completed</span>' : ''}
        </div>
      </div>
      <h3 class="topic-card__title">${escapeHtml(topic.title)}</h3>
      <p class="topic-card__desc">${escapeHtml(topic.summary)}</p>
      <div class="topic-card__meta">
        <span class="pill">${topic.minutes} min</span>
        <span class="pill">2 videos</span>
        <span class="pill">${topic.quiz.length} quiz Qs</span>
        ${quizScore ? `<span class="pill">${quizScore.correctCount}/${quizScore.totalCount} quiz</span>` : ''}
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn--primary" data-open-topic="${topic.id}">Open detail</button>
        <button class="btn ${completed ? 'btn--success' : 'btn--ghost'}" data-toggle-complete="${topic.id}">
          ${completed ? 'Completed' : 'Mark complete'}
        </button>
        <button class="btn btn--ghost" data-toggle-bookmark="${topic.id}">
          ${bookmarked ? 'Remove bookmark' : 'Bookmark'}
        </button>
      </div>
    </article>
  `;
}

function renderRoadmap(data, state, root) {
  const derived = getDerived(data, state);
  const q = state.roadmapSearch.trim().toLowerCase();
  const filteredChapters = data.chapters.filter(chapter => {
    const chapterMatch = chapter.title.toLowerCase().includes(q) || chapter.summary.toLowerCase().includes(q);
    const topicMatch = chapter.topicIds.some(id => {
      const topic = derived.topicById.get(id);
      return topic && [topic.title, topic.summary, topic.category].join(' ').toLowerCase().includes(q);
    });
    return !q || chapterMatch || topicMatch;
  });

  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>12-chapter roadmap</h2>
        <p>Accordion roadmap with instant search and live completion progress.</p>
      </div>
      <div class="count-badge">${Math.round(derived.progressPct)}% complete</div>
    </div>

    <div class="info-card" style="margin-bottom:18px;">
      <div class="helper-row">
        <div>
          <h3 style="margin:0;">Live roadmap progress</h3>
          <p class="muted">Completed ${derived.completedCount} of ${data.topics.length} topics.</p>
        </div>
        <div class="count-badge">${derived.dailyDone}/${state.dailyGoal} daily goal today</div>
      </div>
      <div class="progress-track" style="margin-top:14px;">
        <div class="progress-fill" style="width:${derived.progressPct}%"></div>
      </div>
    </div>

    <input id="roadmapSearchInput" class="input" style="width:100%;margin-bottom:18px;" type="search" value="${escapeHtml(state.roadmapSearch)}" placeholder="Search chapters and topics in real time..." />

    <div class="roadmap-list">
      ${filteredChapters.length ? filteredChapters.map((chapter, index) => renderChapter(chapter, index + 1, derived, state)).join('') : renderEmpty('No roadmap items matched.', 'Try searching by chapter title, topic title, or category.')}
    </div>
  `;
}

function renderChapter(chapter, order, derived, state) {
  const topicCards = chapter.topicIds.map(id => derived.topicById.get(id)).filter(Boolean);
  const done = topicCards.filter(topic => derived.completedIds.has(topic.id)).length;
  const pct = topicCards.length ? (done / topicCards.length) * 100 : 0;
  return `
    <article class="chapter ${state.roadmapSearch ? 'is-open' : ''}">
      <button class="chapter__button" data-toggle-chapter="${chapter.id}">
        <div>
          <div class="pill">${order.toString().padStart(2, '0')}</div>
          <h3 style="margin:10px 0 6px;">${escapeHtml(chapter.title)}</h3>
          <p class="muted" style="margin:0;">${escapeHtml(chapter.summary)}</p>
        </div>
        <div style="min-width:160px;">
          <div class="metric-row__top"><span>${done}/${topicCards.length} complete</span><span>${Math.round(pct)}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </button>
      <div class="chapter__body ${state.roadmapSearch ? 'is-open' : ''}">
        <div class="chapter__summary">${escapeHtml(chapter.summary)}</div>
        <div class="chapter__topics">
          ${topicCards.map(topic => `
            <button class="chapter-topic" data-open-topic="${topic.id}">
              <div>
                <strong>${escapeHtml(topic.title)}</strong>
                <small>${escapeHtml(topic.category)} · ${escapeHtml(topic.level)} · ${topic.minutes} min</small>
              </div>
              <div class="topic-card__meta">
                ${derived.completedIds.has(topic.id) ? '<span class="pill tools">Done</span>' : ''}
                <span class="pill">${topic.quiz.length}Q</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function renderResources(data, state, root) {
  const tab = state.resourceTab;
  const items = data.resources[tab] || [];
  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Resources</h2>
        <p>Exact tab structure for beginner, intermediate, advanced, videos, and tools.</p>
      </div>
      <div class="tab-bar">
        ${['beginner','intermediate','advanced','videos','tools'].map(name => `
          <button class="tab ${tab === name ? 'is-active' : ''}" data-resource-tab="${name}">
            ${name === 'beginner' ? '🌱' : name === 'intermediate' ? '⚡' : name === 'advanced' ? '🚀' : name === 'videos' ? '🎥' : '🛠️'} ${toTitleCase(name)}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="resource-grid">
      ${items.map(item => tab === 'videos' ? `
        <article class="resource-card video-resource">
          <iframe src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(item.title)}" allowfullscreen loading="lazy"></iframe>
          <h3 style="margin-top:14px;">${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.desc)}</p>
          <div class="resource-card__tags">${(item.tags || []).map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="inline-actions" style="margin-top:12px;">
            <a class="btn btn--ghost" href="${escapeHtml(item.watchUrl)}" target="_blank" rel="noreferrer">Open on YouTube</a>
          </div>
        </article>
      ` : `
        <article class="resource-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.desc)}</p>
          <div class="resource-card__tags">${(item.tags || []).map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="inline-actions" style="margin-top:12px;">
            <a class="btn btn--primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open resource</a>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderPlanner(data, state, root) {
  const derived = getDerived(data, state);
  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Study planner</h2>
        <p>Daily goal, due reviews, certificate readiness, and capstone suggestions.</p>
      </div>
      <div class="count-badge">${derived.dueReviews.length} reviews due</div>
    </div>

    <div class="planner-grid">
      <div class="info-card">
        <h3>Daily goal</h3>
        <p>Set how many new completions you want to hit each day. The planner uses local persistence and shows your progress for today.</p>
        <div class="helper-row" style="margin:12px 0;">
          <input id="dailyGoalInput" class="input" type="number" min="1" max="12" value="${state.dailyGoal}" />
          <div class="count-badge">${derived.dailyDone}/${state.dailyGoal} completed today</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${Math.min(100, (derived.dailyDone / state.dailyGoal) * 100)}%"></div>
        </div>

        <div class="section-head" style="margin-top:22px;">
          <div>
            <h2 style="font-size:18px;">Spaced repetition queue</h2>
            <p>Review completed topics after 1, 3, and 7-day intervals.</p>
          </div>
        </div>
        <div class="metric-list">
          ${derived.dueReviews.length ? derived.dueReviews.map(topic => {
            const record = state.completed[String(topic.id)];
            return `
              <article class="review-card">
                <h3>${escapeHtml(topic.title)}</h3>
                <p>Review stage ${record?.reviewStage ?? 0} · due ${formatDate(record?.nextReviewDate)}</p>
                <div class="inline-actions" style="margin-top:12px;">
                  <button class="btn btn--primary" data-open-topic="${topic.id}">Open topic</button>
                  <button class="btn btn--success" data-review-done="${topic.id}">Mark review done</button>
                </div>
              </article>
            `;
          }).join('') : renderEmpty('No review is due today.', 'Complete a topic and the review schedule will start automatically.')}
        </div>
      </div>

      <div class="info-card">
        <h3>Certificate readiness</h3>
        <p>${derived.completedCount === data.topics.length ? 'You have completed the full curriculum. You can download your local certificate now.' : 'Complete the full curriculum to unlock the certificate download.'}</p>
        <div class="metric-list">
          <div class="metric-row">
            <div class="metric-row__top"><span>Total completion</span><span>${Math.round(derived.progressPct)}%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${derived.progressPct}%"></div></div>
          </div>
          <div class="metric-row">
            <div class="metric-row__top"><span>Bookmarked topics</span><span>${derived.bookmarkedIds.size}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${(derived.bookmarkedIds.size / Math.max(1, data.topics.length)) * 100}%"></div></div>
          </div>
          <div class="metric-row">
            <div class="metric-row__top"><span>Topics with notes</span><span>${Object.keys(state.notes).length}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${(Object.keys(state.notes).length / Math.max(1, data.topics.length)) * 100}%"></div></div>
          </div>
        </div>

        <div class="inline-note" style="margin-top:16px;">
          Backend sync is not mocked here. This project is modular and ready for Supabase/Firebase integration, but this artifact remains a frontend implementation.
        </div>

        <div class="section-head" style="margin-top:22px;">
          <div>
            <h2 style="font-size:18px;">Suggested capstones</h2>
            <p>Pick one after every few chapters.</p>
          </div>
        </div>
        <div class="metric-list">
          ${data.projects.slice(0, 4).map(project => `
            <article class="project-card">
              <div class="pill ${project.level === 'Beginner' ? 'tools' : project.level === 'Intermediate' ? 'javascript' : 'apis'}">${escapeHtml(project.level)}</div>
              <h3>${escapeHtml(project.title)}</h3>
              <p>${escapeHtml(project.outcome)}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderAnalytics(data, state, root) {
  const derived = getDerived(data, state);
  const recentActivity = (state.activityLog || []).slice(0, 8);
  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Progress analytics</h2>
        <p>Live category progress, engagement signals, and recent activity.</p>
      </div>
      <div class="count-badge">${derived.streak} day streak</div>
    </div>

    <div class="analytics-grid">
      <article class="metric-card">
        <strong>${derived.completedCount}</strong>
        <h3>Completed topics</h3>
        <p>${data.topics.length - derived.completedCount} topics remaining in the full curriculum.</p>
      </article>
      <article class="metric-card">
        <strong>${derived.bookmarkedIds.size}</strong>
        <h3>Bookmarks</h3>
        <p>Bookmarked topics are great candidates for deep review or project work.</p>
      </article>
      <article class="metric-card">
        <strong>${Object.keys(state.notes).length}</strong>
        <h3>Topics with notes</h3>
        <p>Stored notes persist locally and travel with export/import progress files.</p>
      </article>
    </div>

    <div class="overview-grid" style="margin-top:18px;">
      <article class="info-card">
        <h3>Completion by category</h3>
        <div class="metric-list">
          ${derived.categoryProgress.map(item => `
            <div class="metric-row">
              <div class="metric-row__top"><span>${toTitleCase(item.category)}</span><span>${item.done}/${item.total}</span></div>
              <div class="progress-track"><div class="progress-fill" style="width:${item.pct}%"></div></div>
            </div>
          `).join('')}
        </div>
      </article>

      <article class="info-card">
        <h3>Recent activity</h3>
        <div class="metric-list">
          ${recentActivity.length ? recentActivity.map(item => {
            const topic = item.topicId ? data.topics.find(t => t.id === item.topicId) : null;
            return `
              <div class="review-card">
                <h3 style="margin-bottom:6px;">${escapeHtml(item.type.replaceAll('-', ' '))}</h3>
                <p>${topic ? `${escapeHtml(topic.title)} · ` : ''}${formatDate(item.at)}</p>
              </div>
            `;
          }).join('') : renderEmpty('No recent activity yet.', 'Open a topic, complete a lesson, or save a note to start building analytics.')}
        </div>
      </article>
    </div>
  `;
}

function renderGlossary(data, root) {
  root.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Glossary</h2>
        <p>Fast revision for important Shopify development terms.</p>
      </div>
      <div class="count-badge">${data.glossary.length} terms</div>
    </div>

    <div class="glossary-grid">
      ${data.glossary.map(entry => `
        <article class="glossary-card">
          <h3>${escapeHtml(entry.term)}</h3>
          <p>${escapeHtml(entry.definition)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderDetailPanel(data, state, root) {
  const derived = getDerived(data, state);
  const topic = derived.activeTopic;
  if (!topic) {
    root.classList.remove('is-open');
    root.innerHTML = '';
    return;
  }
  root.classList.add('is-open');
  const completed = derived.completedIds.has(topic.id);
  const bookmarked = derived.bookmarkedIds.has(topic.id);
  const savedNote = state.notes[String(topic.id)] || '';
  const score = state.quizScores[String(topic.id)];
  root.innerHTML = `
    <div class="detail-panel__header">
      <div class="detail-toolbar">
        <div class="topic-card__meta">
          <span class="pill ${topic.category}">${escapeHtml(topic.category)}</span>
          <span class="pill">${escapeHtml(topic.level)}</span>
          <span class="pill">${topic.minutes} min</span>
        </div>
        <button class="icon-btn detail-panel__close" data-close-topic aria-label="Close topic panel">✕</button>
      </div>
      <h2 class="detail-panel__title">${escapeHtml(topic.title)}</h2>
      <p class="detail-panel__summary">${escapeHtml(topic.summary)}</p>
      <div class="kv-grid">
        <div class="kv"><span>Chapter</span><strong>${topic.chapterId}</strong></div>
        <div class="kv"><span>Quiz</span><strong>${topic.quiz.length} questions</strong></div>
        <div class="kv"><span>Status</span><strong>${completed ? 'Completed' : 'In progress'}</strong></div>
      </div>
      <div class="tab-bar">
        ${['concepts','code','videos'].map(tab => `
          <button class="tab ${state.activeTopicTab === tab ? 'is-active' : ''}" data-topic-tab="${tab}">
            ${tab === 'concepts' ? '1. Concepts' : tab === 'code' ? '2. Code' : '3. Videos'}
          </button>
        `).join('')}
      </div>
      <div class="inline-actions" style="margin-top:14px;">
        <button class="btn ${completed ? 'btn--success' : 'btn--primary'}" data-toggle-complete="${topic.id}">
          ${completed ? 'Completed' : 'Mark complete'}
        </button>
        <button class="btn btn--ghost" data-toggle-bookmark="${topic.id}">
          ${bookmarked ? 'Remove bookmark' : 'Bookmark'}
        </button>
        <a class="btn btn--ghost" href="${slugToHash(topic.slug)}">Direct link</a>
      </div>
    </div>
    <div class="detail-panel__body">
      ${state.activeTopicTab === 'concepts' ? renderConceptsTab(topic, savedNote, score) : ''}
      ${state.activeTopicTab === 'code' ? renderCodeTab(topic) : ''}
      ${state.activeTopicTab === 'videos' ? renderVideosTab(topic) : ''}
    </div>
  `;
}

function renderConceptsTab(topic, savedNote, score) {
  return `
    <div>
      <div class="inline-note">Teaching style: what it is, why it matters, and how to use it in real Shopify builds.</div>
      <ul class="point-list">
        ${topic.concepts.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
      ${renderResourcesInline(topic)}
      ${renderQuiz(topic, score)}
      ${renderNotes(topic, savedNote)}
    </div>
  `;
}

function renderCodeTab(topic) {
  return `
    <div>
      <div class="code-block">
        <div class="code-block__head">
          <span>${escapeHtml(topic.codeLang)}</span>
          <button class="copy-btn" data-copy-code="${topic.id}">Copy code</button>
        </div>
        <pre><code>${escapeHtml(topic.code)}</code></pre>
      </div>
      <div class="inline-note" style="margin-top:14px;">
        Use the copy button to move this snippet into your theme, app, or playground. Keep adapting it to your real store data and naming conventions.
      </div>
    </div>
  `;
}

function renderVideosTab(topic) {
  return `
    <div class="video-grid">
      ${topic.videos.map((video, index) => `
        <article class="video-card">
          <iframe src="${escapeHtml(video.embedUrl)}" title="${escapeHtml(video.title)}" loading="lazy" allowfullscreen></iframe>
          <div class="video-card__meta">
            <span class="pill">${index === 0 ? 'Video 1 · Concept Explanation' : 'Video 2 · Practical Implementation'}</span>
            <strong>${escapeHtml(video.title)}</strong>
            <p>${escapeHtml(video.description)}</p>
            <div class="inline-actions" style="margin-top:12px;">
              <a class="btn btn--ghost" href="${escapeHtml(video.watchUrl)}" target="_blank" rel="noreferrer">Open on YouTube</a>
            </div>
          </div>
        </article>
      `).join('')}
      <div class="inline-note">
        Workflow recommendation: read the Concepts tab first, inspect the Code tab next, then watch both videos and implement the idea in a real store or dev theme.
      </div>
    </div>
  `;
}

function renderResourcesInline(topic) {
  return `
    <div class="notes-box">
      <h3 style="margin-top:0;">Official references</h3>
      <div class="metric-list">
        ${topic.resources.map(resource => `
          <article class="review-card">
            <h3>${escapeHtml(resource.label)}</h3>
            <p>${escapeHtml(resource.tag)} reference for deeper reading.</p>
            <div class="inline-actions" style="margin-top:12px;">
              <a class="btn btn--ghost" href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer">Open resource</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderQuiz(topic, score) {
  return `
    <div class="quiz-box">
      <div class="helper-row">
        <div>
          <h3 style="margin:0;">Knowledge check</h3>
          <p class="muted" style="margin:6px 0 0;">Answer both questions to store your local quiz score.</p>
        </div>
        ${score ? `<span class="pill tools">${score.correctCount}/${score.totalCount} correct</span>` : ''}
      </div>
      ${topic.quiz.map((question, index) => `
        <div class="quiz-item" style="margin-top:16px;">
          <p class="quiz-question">${index + 1}. ${escapeHtml(question.question)}</p>
          <div class="quiz-options">
            ${question.options.map((option, optionIndex) => `
              <label>
                <input type="radio" name="quiz-${topic.id}-${index}" value="${optionIndex}" />
                <span>${escapeHtml(option)}</span>
              </label>
            `).join('')}
          </div>
          <div class="quiz-feedback" data-quiz-feedback="${topic.id}-${index}"></div>
        </div>
      `).join('')}
      <div class="inline-actions" style="margin-top:16px;">
        <button class="btn btn--primary" data-submit-quiz="${topic.id}">Check answers</button>
      </div>
    </div>
  `;
}

function renderNotes(topic, savedNote) {
  return `
    <div class="notes-box">
      <h3 style="margin-top:0;">Private study notes</h3>
      <textarea class="textarea" data-note-input="${topic.id}" placeholder="Write your implementation notes, gotchas, API scopes, schema ideas, or reminders...">${escapeHtml(savedNote)}</textarea>
      <div class="notes-meta">
        <span>Notes persist in localStorage and export/import JSON.</span>
        <button class="btn btn--ghost" data-save-note="${topic.id}">Save note</button>
      </div>
    </div>
  `;
}

function renderHeaderStats(data, state, refs) {
  const derived = getDerived(data, state);
  refs.headerProgressText.textContent = formatPercent(derived.progressPct);
  refs.headerStreakText.textContent = `${derived.streak}d`;
  refs.topicCountPill.textContent = String(data.topics.length);
}

function syncFilterButtons(state) {
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.classList.toggle('is-active', button.dataset.category === state.category);
  });
}

function syncNavButtons(state) {
  document.querySelectorAll('.nav-btn[data-nav-page]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.navPage === state.page);
  });
}

function syncResourceTabs(state) {
  document.querySelectorAll('.tab[data-resource-tab]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.resourceTab === state.resourceTab);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function applyPageState(page) {
  document.querySelectorAll('.page').forEach(section => {
    section.classList.toggle('is-active', section.dataset.page === page);
  });
}

function applySidebar(isOpen, refs) {
  refs.sidebar.classList.toggle('is-open', isOpen);
  refs.sidebarBackdrop.hidden = !isOpen;
  document.body.classList.toggle('sidebar-open', isOpen);
}

function renderEmpty(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
    </div>
  `;
}

function filterTopics(topics, state, derived) {
  const query = state.search.trim().toLowerCase();
  return topics.filter(topic => {
    const categoryOk = state.category === 'all' || topic.category === state.category;
    const levelOk = state.filters.level === 'all' || topic.level === state.filters.level;
    const bookmarkOk = !state.filters.bookmarksOnly || derived.bookmarkedIds.has(topic.id);
    const incompleteOk = !state.filters.incompleteOnly || !derived.completedIds.has(topic.id);
    const haystack = [
      topic.title,
      topic.summary,
      topic.category,
      topic.level,
      topic.code,
      ...topic.concepts,
      ...topic.resources.map(resource => resource.label)
    ].join(' ').toLowerCase();
    const searchOk = !query || haystack.includes(query);
    return categoryOk && levelOk && bookmarkOk && incompleteOk && searchOk;
  });
}

function calculateStreak(visitDates) {
  const set = new Set(visitDates);
  let streak = 0;
  const date = new Date();
  while (true) {
    const iso = date.toISOString().slice(0, 10);
    if (!set.has(iso)) {
      if (streak === 0) {
        date.setDate(date.getDate() - 1);
        const yesterday = date.toISOString().slice(0, 10);
        if (!set.has(yesterday)) return 0;
        if (set.has(yesterday)) {
          streak += 1;
          continue;
        }
      }
      break;
    }
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}
