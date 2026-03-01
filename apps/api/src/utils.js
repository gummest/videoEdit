import fs from 'fs/promises';

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(filePaths) {
  const cleanupPromises = filePaths
    .filter(Boolean)
    .map(filePath => 
      fs.unlink(filePath).catch(err => {
        console.error(`Failed to cleanup ${filePath}:`, err.message);
      })
    );
  
  await Promise.all(cleanupPromises);
}
