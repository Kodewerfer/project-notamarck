// pathbroserfy.basename() does not work, maybe path/posix related
export function getLastPartOfPath(fullPath: string) {
  let tempPath = fullPath.replace(/\\/g, '/');
  let pathParts = tempPath.split('/');
  return pathParts[pathParts.length - 1];
}

export function removeLastPartOfPath(fullPath: string): string {
  const lastSeparatorIndex = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));

  if (lastSeparatorIndex === -1) {
    return fullPath;
  }

  const fileName = fullPath.substring(lastSeparatorIndex + 1);

  // The last part does not appear to be a file name
  if (!fileName.includes('.')) {
    return fullPath;
  }

  return fullPath.substring(0, lastSeparatorIndex);
}
