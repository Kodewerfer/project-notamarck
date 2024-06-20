/**
 *
 * Formats a file size into a human-readable format.
 *
 * @param {number} size - The file size in bytes.
 * @returns {string} - The formatted file size with the appropriate unit.
 */
export function FormatFileSize(size: number) {
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const formattedSize = parseFloat((size / Math.pow(1024, i)).toFixed(2));
    return formattedSize + " " + ["B", "KB", 'MB', "GB", "TB"][i];
}