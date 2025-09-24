const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Paths
const postsPath = path.join(__dirname, "posts.json");
const seedsDir = path.join(__dirname, "seeds");
const growingDir = path.join(__dirname, "growing");
const harvestedDir = path.join(__dirname, "harvested");
const abandonedDir = path.join(__dirname, "abandoned");
const templatesDir = path.join(__dirname, "templates");

// Helpers
function generateFilename(title) {
  return title.toLowerCase().replace(/\s+/g, "-") + ".html";
}

function getTimestamp() {
  return new Date().toISOString();
}

function formatDate(isoString) {
  return isoString ? isoString.split("T")[0] : "";
}

function loadPosts() {
  if (!fs.existsSync(postsPath)) return [];
  return JSON.parse(fs.readFileSync(postsPath, "utf-8"));
}

function savePosts(posts) {
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
}

// Generate HTML from template
function createPostFile(post, templateFile, outputDir) {
  let template = fs.readFileSync(path.join(templatesDir, templateFile), "utf-8");

  const plantedDate = formatDate(post.dates.planted);
  const lastUpdatedDate = formatDate(post.dates.lastUpdated);
  const growingStartedDate = formatDate(post.dates.growingStarted);
  const harvestedDate = formatDate(post.dates.harvestedOn);
  const abandonedDate = formatDate(post.dates.abandonedOn);

  const tagsList = `<ul class="flex flex-row gap-2">${post.tags.map(tag => `<li class="bg-gray-300 px-2 py-1 rounded">${tag}</li>`).join("")}</ul>`;
  const linksList = `<ul class="list-disc pl-5">${post.links.map(link => `<li><a href="${link}" target="_blank" class="text-blue-600 underline">${link}</a></li>`).join("")}</ul>`;

  template = template
    .replace(/{{title}}/g, post.title)
    .replace(/{{dates.planted}}/g, plantedDate)
    .replace(/{{dates.lastUpdated}}/g, lastUpdatedDate)
    .replace(/{{dates.growingStarted}}/g, growingStartedDate)
    .replace(/{{dates.harvestedOn}}/g, harvestedDate)
    .replace(/{{dates.abandonedOn}}/g, abandonedDate)
    .replace(/{{tags}}/g, tagsList)
    .replace(/{{content}}/g, post.content)
    .replace(/{{links}}/g, linksList);

  const filename = generateFilename(post.title);
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, template);

  return path.join(path.basename(outputDir), filename);
}

// Stage transition helper
function movePost(post, newStage, templateFile, outputDir, dateField) {
  const timestamp = getTimestamp();

  // Determine old folder before changing stage
  const oldStage = post.stage;
  const oldDir = oldStage === "seed" ? seedsDir :
                 oldStage === "growing" ? growingDir :
                 oldStage === "harvested" ? harvestedDir :
                 oldStage === "abandoned" ? abandonedDir : null;

  // Update post
  post.stage = newStage;
  post.dates[dateField] = timestamp;
  post.dates.lastUpdated = timestamp;

  // Create new stage file
  const link = createPostFile(post, templateFile, outputDir);
  post.link = link;

  // Delete old file
  if (oldDir) {
    const oldFile = path.join(oldDir, generateFilename(post.title));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  // Update posts.json
  const posts = loadPosts();
  const index = posts.findIndex(p => p.title === post.title);
  posts[index] = post;
  savePosts(posts);

  console.log(`✅ Post "${post.title}" moved to ${newStage} stage: ${link}`);
}


// CLI prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(resolve => rl.question(q, ans => resolve(ans)));
}

// Add new seed
async function addNewSeed() {
  const title = await ask("Title: ");
  const content = await ask("Content: ");
  const tagsInput = await ask("Tags (comma separated): ");
  const linksInput = await ask("Links (comma separated): ");

  const tags = tagsInput.split(",").map(t => t.trim()).filter(t => t);
  const links = linksInput.split(",").map(l => l.trim()).filter(l => l);

  const timestamp = getTimestamp();
  const post = {
    title,
    stage: "seed",
    tags,
    content,
    links,
    dates: {
      planted: timestamp,
      growingStarted: null,
      harvestedOn: null,
      abandonedOn: null,
      lastUpdated: timestamp
    }
  };

  const link = createPostFile(post, "seed-template.html", seedsDir);
  post.link = link;

  const posts = loadPosts();
  posts.push(post);
  savePosts(posts);

  console.log(`✅ Seed post created at ${link}`);
  rl.close();
}

// Select post from a stage
async function selectPost(stage) {
  const posts = loadPosts();
  const filtered = posts.filter(p => p.stage === stage);
  if (filtered.length === 0) {
    console.log(`No posts in stage "${stage}"`);
    rl.close();
    return null;
  }

  console.log(`\nAvailable ${stage} posts:`);
  filtered.forEach((p, i) => console.log(`${i + 1}) ${p.title}`));

  const choice = await ask("Enter the number of the post: ");
  const index = parseInt(choice.trim()) - 1;
  if (index < 0 || index >= filtered.length) {
    console.log("Invalid choice.");
    rl.close();
    return null;
  }

  return filtered[index];
}

// Grow, Harvest, Abandon CLI
async function growPostCLI() {
  const post = await selectPost("seed");
  if (post) movePost(post, "growing", "growing-template.html", growingDir, "growingStarted");
  rl.close();
}

async function harvestPostCLI() {
  const post = await selectPost("growing");
  if (post) movePost(post, "harvested", "harvested-template.html", harvestedDir, "harvestedOn");
  rl.close();
}

// Abandon post CLI: select from Seed or Growing
async function abandonPostCLI() {
  const posts = loadPosts();
  const filtered = posts.filter(p => p.stage === "seed" || p.stage === "growing");

  if (filtered.length === 0) {
    console.log("No posts available to abandon.");
    rl.close();
    return;
  }

  console.log("\nAvailable posts to abandon (Seed or Growing):");
  filtered.forEach((p, i) => console.log(`${i + 1}) [${p.stage}] ${p.title}`));

  const choice = await ask("Enter the number of the post to abandon: ");
  const index = parseInt(choice.trim()) - 1;

  if (index < 0 || index >= filtered.length) {
    console.log("Invalid choice.");
    rl.close();
    return;
  }

  movePost(filtered[index], "abandoned", "abandoned-template.html", abandonedDir, "abandonedOn");
  rl.close();
}

// Main CLI menu
async function main() {
  console.log("=== Digital Garden Admin CLI ===");
  console.log("1) Add new seed");
  console.log("2) Grow a seed");
  console.log("3) Harvest a growing post");
  console.log("4) Abandon a seed");
  console.log("5) Exit");

  const choice = await ask("Choose an option: ");

  switch(choice.trim()) {
    case "1":
      await addNewSeed();
      break;
    case "2":
      await growPostCLI();
      break;
    case "3":
      await harvestPostCLI();
      break;
    case "4":
      await abandonPostCLI();
      break;
    case "5":
      rl.close();
      return;
    default:
      console.log("Invalid choice");
      rl.close();
  }
}

main();
