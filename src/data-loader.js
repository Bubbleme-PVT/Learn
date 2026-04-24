const dataUrl = file => `${import.meta.env.BASE_URL}data/${file}`;

async function loadJson(file) {
  const response = await fetch(dataUrl(file));
  if (!response.ok) {
    throw new Error(`Failed to load ${file} (${response.status})`);
  }
  return response.json();
}

export async function loadAllData() {
  const [topics, chapters, resources, glossary, projects] = await Promise.all([
    loadJson('topics.json'),
    loadJson('chapters.json'),
    loadJson('resources.json'),
    loadJson('glossary.json'),
    loadJson('projects.json')
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
