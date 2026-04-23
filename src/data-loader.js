
export async function loadAllData() {
  const [topics, chapters, resources, glossary, projects] = await Promise.all([
    fetch('/data/topics.json').then(r => r.json()),
    fetch('/data/chapters.json').then(r => r.json()),
    fetch('/data/resources.json').then(r => r.json()),
    fetch('/data/glossary.json').then(r => r.json()),
    fetch('/data/projects.json').then(r => r.json())
  ]);

  validateTopics(topics);
  return { topics, chapters, resources, glossary, projects };
}

function validateTopics(topics) {
  const allowedCategories = new Set(['liquid', 'sections', 'metafields', 'apps', 'apis', 'javascript', 'tools']);

  topics.forEach(topic => {
    if (!allowedCategories.has(topic.category)) {
      throw new Error(`Invalid category on topic "${topic.title}"`);
    }
    if (!Array.isArray(topic.videos) || topic.videos.length !== 2) {
      throw new Error(`Topic "${topic.title}" must have exactly 2 videos.`);
    }
    if (!Array.isArray(topic.quiz) || topic.quiz.length < 2) {
      throw new Error(`Topic "${topic.title}" must have at least 2 quiz questions.`);
    }
  });
}
