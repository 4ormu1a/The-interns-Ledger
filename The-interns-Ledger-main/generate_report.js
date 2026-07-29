const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'client/src/pages');
const layoutDir = path.join(__dirname, 'client/src/components/layout');

// recursive get files
function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const allPages = getFiles(pagesDir);
const allLayouts = getFiles(layoutDir);

const filesToScan = [...allPages, ...allLayouts];

filesToScan.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n--- ${path.basename(file)} ---`);
  
  if (content.includes('<h1')) console.log('Contains H1');
  if (content.includes('<h2')) console.log('Contains H2');
  if (content.includes('<h3')) console.log('Contains H3');
  
  // check for specific classes
  const classes = [
    'rolebtn', 'rolepill', 'formwrap', 'p-mid', 'p-feat', 'p-foot', 'side-top', 
    'consent', 'remember', 'divider', 'alt', 'note', 'formerr', 'formok',
    'u-meta', 'crumbs', 'btn', 'btn-sm', 'st', 'hint',
    'stat-card', 'table', 'sidebar', 'stat', 'val', 'label', 'th', 'td'
  ];
  
  classes.forEach(c => {
    // using regex to ensure it's a class or element
    if (content.includes(`"${c}"`) || content.includes(`'${c}'`) || content.includes(`\`.${c}\``)) {
      console.log(`Contains class: ${c}`);
    } else if (c === 'table' && content.includes('<table')) {
      console.log('Contains class: table');
    } else if (c === 'th' && content.includes('<th')) {
      console.log('Contains class: th');
    } else if (c === 'td' && content.includes('<td')) {
      console.log('Contains class: td');
    }
  });
});
