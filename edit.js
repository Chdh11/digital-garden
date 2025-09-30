const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const postsPath = path.join(__dirname, "posts.json");
const folders = ["seeds", "growing", "harvested", "abandoned"];

// Load posts.json
function loadPosts() {
  if (!fs.existsSync(postsPath)) return [];
  return JSON.parse(fs.readFileSync(postsPath, "utf-8"));
}

// Save posts.json
function savePosts(posts) {
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
}

// Sync HTML -> JSON content
function syncHtmlToJson(posts) {
  folders.forEach(folder => {
    const dirPath = path.join(__dirname, folder);

    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".html"));

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const html = fs.readFileSync(filePath, "utf-8");
      
      // Load with options to preserve formatting
      const $ = cheerio.load(html, {
        decodeEntities: false,
        xmlMode: false,
        lowerCaseTags: false
      });

      const contentElement = $("#content");
      const newContent = contentElement.html(); // Gets innerHTML of <div id="content">
      const title = $("title").text().trim();

      console.log(`📄 File: ${file}`);
      console.log(`📌 Title: ${title}`);
      console.log(`📝 Content found: ${newContent ? 'YES' : 'NO'}`);
      console.log(`📏 Content length: ${newContent ? newContent.length : 0}`);

      if (!newContent) {
        console.log(`⚠️ No content found in <div id="content"> for: ${file}`);
        return;
      }

      const post = posts.find(p => p.title === title);

      if (post) {
        // Update the lastUpdated date
        const updatedDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        post.content = newContent;
        post.dates.lastUpdated = new Date().toISOString();
        
        // Update the date in the HTML file
        const updatedSpan = $("#updated_date");
        if (updatedSpan.length > 0) {
          updatedSpan.html(`<b>Data Updated:</b> ${updatedDate}`);
          
          // Save the updated HTML back to the file
          fs.writeFileSync(filePath, $.html(), "utf-8");
          console.log(`📅 Updated date in HTML: ${updatedDate}`);
        } else {
          console.log(`⚠️ No <span id="updated_date"> found in: ${file}`);
        }
        
        console.log(`✅ Synced content for: ${title}\n`);
      } else {
        console.log(`⚠️ No matching post found in posts.json for file: ${file}\n`);
      }
    });
  });

  savePosts(posts);
  console.log("✨ posts.json updated successfully!");
}

// Run script
function main() {
  const posts = loadPosts();
  syncHtmlToJson(posts);
}

main();