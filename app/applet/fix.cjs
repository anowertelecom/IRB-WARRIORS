const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regexes = [
  /value=\{newPlayer\.([a-zA-Z0-9_]*)\}/g,
  /value=\{editingPlayer\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newMember\.([a-zA-Z0-9_]*)\}/g,
  /value=\{editingMember\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newGallery\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newEvent\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newFinance\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newMatch\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newHosted\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newExternal\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newExternalMatch\.([a-zA-Z0-9_]*)\}/g,
  /value=\{newExternalExpense\.([a-zA-Z0-9_]*)\}/g,
  /value=\{settings\.([a-zA-Z0-9_]*)\}/g,
  /value=\{editStats\.([a-zA-Z0-9_]*)\}/g,
  /value=\{matchScore\.([a-zA-Z0-9_]*)\}/g
];

regexes.forEach(regex => {
  content = content.replace(regex, 'value={$1.$2 || ""}'); // wait, the replacement depends on matched object name.
});

// A better way:
content = content.replace(/value=\{(newPlayer|editingPlayer|newMember|editingMember|newGallery|newEvent|newFinance|newMatch|newHosted|newExternal|newExternalMatch|newExternalExpense|settings|editStats|matchScore)\.([a-zA-Z0-9_]*)\}/g, 'value={$1.$2 || ""}');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed');
