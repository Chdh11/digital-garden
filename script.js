// script.js

// Load posts and render them
async function loadPosts() {
  try {
    const res = await fetch('posts.json'); // posts.json should be in the same folder as index.html
    const posts = await res.json();
    renderPosts(posts);
  } catch (err) {
    console.error("Error loading posts:", err);
  }
}

function renderPosts(posts) {
  const container = document.querySelector('section.ml-20.mt-7 > div:nth-child(2)');
  container.innerHTML = ''; // clear existing

  const wrapper = document.createElement('div');
  wrapper.className = 'mr-20 mt-5';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-5';

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = `border-2 border-${post.stage} rounded p-4 bg-white cursor-pointer hover:shadow-lg`;
    card.innerHTML = `
      <h2 class="text-xl font-bold mb-2">${post.title}</h2>
      <p class="text-sm mb-2">Stage: <span class="font-semibold">${post.stage}</span></p>
      <p class="text-sm mb-2">Last Updated: ${post.dates.lastUpdated.split('T')[0]}</p>
    `;
    card.addEventListener('click', () => openPost(post.link));
    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}


// Open post in new tab
function openPost(link) {
  window.open(link, '_blank');
}

// Filter buttons
document.querySelectorAll('ul.flex.flex-row.gap-3 > button').forEach(btn => {
  btn.addEventListener('click', () => {
    const stage = btn.textContent.trim().toLowerCase();
    filterPosts(stage);
  });
});

async function filterPosts(stage) {
  try {
    const res = await fetch('posts.json');
    let posts = await res.json();
    if (stage !== 'all') {
      posts = posts.filter(p => p.stage === stage);
    }
    renderPosts(posts);
  } catch (err) {
    console.error(err);
  }
}

// Initial load
loadPosts();
