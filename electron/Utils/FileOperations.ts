import path from 'node:path';
import fs from 'node:fs';

export function saveContentToFileRenameOnDup(FileFullName: string, FileContent?: string) {
  // rename with a -1
  if (fs.existsSync(FileFullName)) {
    const parsedPath = path.parse(FileFullName);
    let appendixNum = 1;

    do {
      const appendix = `-${appendixNum}`;
      FileFullName = path.join(parsedPath.dir, `${parsedPath.name}${appendix}${parsedPath.ext}`);
      appendixNum++;
    } while (fs.existsSync(FileFullName));
  }
  try {
    fs.writeFileSync(FileFullName, FileContent ?? '', { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Error writing to file ${FileFullName}, ${e}`);
  }
}

export function UnlinkFile(FileFullName: string) {
  try {
    fs.unlinkSync(FileFullName);
  } catch (e) {
    throw new Error(`Error deleting file ${FileFullName}, ${e}`);
  }
}
