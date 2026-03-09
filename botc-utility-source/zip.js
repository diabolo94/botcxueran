import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

function addDirectoryToZip(dirPath, zipFolder) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'public' || file === 'migrated_prompt_history') {
      continue;
    }
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      zipFolder.file(file, null, {
        dir: true,
        unixPermissions: stat.mode
      });
      const newFolder = zipFolder.folder(file);
      addDirectoryToZip(fullPath, newFolder);
    } else {
      zipFolder.file(file, fs.readFileSync(fullPath), {
        unixPermissions: stat.mode
      });
    }
  }
}

addDirectoryToZip('.', zip);

zip.generateAsync({ 
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: {
    level: 6
  },
  platform: 'UNIX'
}).then((content) => {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }
  fs.writeFileSync('public/source-code.zip', content);
  console.log('Successfully created public/source-code.zip');
});
