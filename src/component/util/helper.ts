// pathbroserfy.basename() does not work, maybe path/posix related
export function getLastPartOfPath(fullPath: string) {
  let tempPath = fullPath.replace(/\\/g, '/');
  let pathParts = tempPath.split('/');
  return pathParts[pathParts.length - 1];
}