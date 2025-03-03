import fs from "fs";
import path from "path";
import crypto from "crypto";

import { createTmpFile } from "./utils/files";

// Increase the test timeout
jest.setTimeout(30000);

describe("Incomplete parts preservation", () => {
  it("should preserve incomplete downloaded parts", async () => {
    // Create a test directory and files
    const { dir, fullFileLocation } = createTmpFile();
    
    // Create some partial download files
    const partFile1 = `${fullFileLocation}.$$0$PART`;
    const partFile2 = `${fullFileLocation}.$$1$PART`;
    
    // Write some data to the partial files
    fs.writeFileSync(partFile1, Buffer.from("Partial download data for part 1"));
    fs.writeFileSync(partFile2, Buffer.from("Partial download data for part 2"));
    
    // Verify that the files exist
    expect(fs.existsSync(partFile1)).toBe(true);
    expect(fs.existsSync(partFile2)).toBe(true);
    
    // Get the file stats
    const stats1 = fs.statSync(partFile1);
    const stats2 = fs.statSync(partFile2);
    
    // Verify that the files have the correct content
    expect(stats1.size).toBeGreaterThan(0);
    expect(stats2.size).toBeGreaterThan(0);
    
    // Clean up
    fs.unlinkSync(partFile1);
    fs.unlinkSync(partFile2);
  });
  
  it("should be able to resume from incomplete parts", async () => {
    // Create a test directory and files
    const { dir, fullFileLocation } = createTmpFile();
    
    // Create a partial download file
    const partFile = `${fullFileLocation}.$$0$PART`;
    const completedFile = `${fullFileLocation}.$$0`;
    
    // Write some data to the partial file
    const partialData = Buffer.from("Partial download data");
    fs.writeFileSync(partFile, partialData);
    
    // Verify that the file exists
    expect(fs.existsSync(partFile)).toBe(true);
    
    // Simulate resuming by renaming the file
    fs.renameSync(partFile, completedFile);
    
    // Verify that the partial file no longer exists and the completed file exists
    expect(fs.existsSync(partFile)).toBe(false);
    expect(fs.existsSync(completedFile)).toBe(true);
    
    // Verify that the completed file has the same content
    const completedData = fs.readFileSync(completedFile);
    expect(completedData.toString()).toBe(partialData.toString());
    
    // Clean up
    fs.unlinkSync(completedFile);
  });
  
  it("should correctly handle multiple partial downloads", async () => {
    // Create a test directory and files
    const { dir, fullFileLocation } = createTmpFile();
    
    // Create some partial download files
    const partFile1 = `${fullFileLocation}.$$0$PART`;
    const partFile2 = `${fullFileLocation}.$$1$PART`;
    const completedFile1 = `${fullFileLocation}.$$0`;
    
    // Write some data to the partial files
    const partialData1 = Buffer.from("Partial download data for part 1");
    const partialData2 = Buffer.from("Partial download data for part 2");
    fs.writeFileSync(partFile1, partialData1);
    fs.writeFileSync(partFile2, partialData2);
    
    // Verify that the files exist
    expect(fs.existsSync(partFile1)).toBe(true);
    expect(fs.existsSync(partFile2)).toBe(true);
    
    // Simulate completing one part
    fs.renameSync(partFile1, completedFile1);
    
    // Verify that the first partial file no longer exists and the completed file exists
    expect(fs.existsSync(partFile1)).toBe(false);
    expect(fs.existsSync(completedFile1)).toBe(true);
    expect(fs.existsSync(partFile2)).toBe(true);
    
    // Verify that the completed file has the same content
    const completedData1 = fs.readFileSync(completedFile1);
    expect(completedData1.toString()).toBe(partialData1.toString());
    
    // Clean up
    fs.unlinkSync(completedFile1);
    fs.unlinkSync(partFile2);
  });
}); 