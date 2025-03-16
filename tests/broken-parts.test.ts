import fs from "fs";
import http from "http";
import path from "path";

import { hashFile } from "./utils/hash";
import { files, createTmpFile } from "./utils/files";

import EasyDl from "../src";
import { mockResumableRequest } from "./utils/mock-http";

beforeEach(() => jest.restoreAllMocks());

describe('Interruption and broken parts handling', () => {
  it("should keep all downloaded chunks after interruption", async () => {
    const request = jest
      .spyOn(http, "request")
      .mockImplementation(mockResumableRequest());

    const { dir, fullFileLocation } = createTmpFile();

    // Create a download instance that we'll interrupt at around 50%
    const dl = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 5,
      chunkSize: 5 * 1024 * 1024 // 5MB chunks
    }).on("progress", ({ total }) => {
      // Destroy the download at around 50% completion
      if (total.percentage >= 50) {
        dl.destroy();
      }
    });

    // Start and wait for the download to be interrupted
    await expect(dl.wait()).resolves.toBe(false);
    
    // Count the chunk files that should exist after interruption
    const files = fs.readdirSync(dir);
    const chunkFiles = files.filter(file => file.match(/\.\$\$[0-9]+$/));
    
    // We should have some chunk files but not all
    expect(chunkFiles.length).toBeGreaterThan(0);
    
    // Get the metadata to check how many chunks there should be total
    const metadata = await dl.metadata();
    expect(metadata.chunks.length).toBeGreaterThan(chunkFiles.length);
    
    // Verify the interrupted download left the completed chunks in place
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(dir, chunkFile);
      expect(fs.existsSync(chunkPath)).toBe(true);
      expect(fs.statSync(chunkPath).size).toBeGreaterThan(0);
    }
  });

  it("should use existing broken parts when resuming download", async () => {
    const request = jest
      .spyOn(http, "request")
      .mockImplementation(mockResumableRequest());

    const { dir, fullFileLocation } = createTmpFile();
    const originalChunkSize = 5 * 1024 * 1024; // 5MB chunks

    // First download - interrupt at 50%
    const dl1 = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 5,
      chunkSize: originalChunkSize
    }).on("progress", ({ total }) => {
      if (total.percentage >= 50) {
        dl1.destroy();
      }
    });

    await expect(dl1.wait()).resolves.toBe(false);
    
    // Get list of chunk files after interruption
    const filesAfterInterrupt = fs.readdirSync(dir);
    const chunksAfterInterrupt = filesAfterInterrupt.filter(file => file.match(/\.\$\$[0-9]+$/));
    expect(chunksAfterInterrupt.length).toBeGreaterThan(0);

    // Clear the request mock to track new requests
    request.mockClear();
    
    // Resume the download with a new instance
    const dl2 = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 5,
      chunkSize: originalChunkSize // Must use same chunk size to resume properly
    });

    const onMetadata = jest.fn();
    dl2.on("metadata", onMetadata);
    
    // Wait for the second download to complete
    await expect(dl2.wait()).resolves.toBe(true);
    
    // Validate that the resumed download used the existing chunks
    expect(onMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        isResume: true,
        progress: expect.arrayContaining([100]), // Some chunks should be at 100%
      })
    );
    
    // Verify the final file is complete and correct
    expect(hashFile(fullFileLocation)).toBe(files["100Mb"].fileHash);
    
    // Verify we didn't re-download chunks that were already complete
    // The HTTP requests should be less than what would be needed for a full download
    const requestCount = request.mock.calls.length;
    expect(requestCount).toBeLessThan(chunksAfterInterrupt.length * 2); // Accounting for HEAD request and some retries
  });

  it("should handle multiple interruptions and still retain chunks", async () => {
    const request = jest
      .spyOn(http, "request")
      .mockImplementation(mockResumableRequest());

    const { dir, fullFileLocation } = createTmpFile();
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    
    // First download - interrupt at 30%
    const dl1 = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 3,
      chunkSize
    }).on("progress", ({ total }) => {
      if (total.percentage >= 30) {
        dl1.destroy();
      }
    });

    await expect(dl1.wait()).resolves.toBe(false);
    
    // Get count of chunk files after first interruption
    const filesAfterFirstInterrupt = fs.readdirSync(dir);
    const chunksAfterFirstInterrupt = filesAfterFirstInterrupt.filter(file => file.match(/\.\$\$[0-9]+$/));
    
    // Second download - interrupt at 60%
    const dl2 = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 3,
      chunkSize
    }).on("progress", ({ total }) => {
      if (total.percentage >= 60) {
        dl2.destroy();
      }
    });

    await expect(dl2.wait()).resolves.toBe(false);
    
    // Get count of chunk files after second interruption
    const filesAfterSecondInterrupt = fs.readdirSync(dir);
    const chunksAfterSecondInterrupt = filesAfterSecondInterrupt.filter(file => file.match(/\.\$\$[0-9]+$/));
    
    // Expect more chunks after second interruption
    expect(chunksAfterSecondInterrupt.length).toBeGreaterThanOrEqual(chunksAfterFirstInterrupt.length);
    
    // Final download - complete it
    const dl3 = new EasyDl("http://example.com/file.dat", fullFileLocation, {
      connections: 3,
      chunkSize
    });

    const onMetadata = jest.fn();
    dl3.on("metadata", onMetadata);
    
    await expect(dl3.wait()).resolves.toBe(true);
    
    // Verify that the download was resumed
    expect(onMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        isResume: true
      })
    );
    
    // Verify the final file is complete
    expect(hashFile(fullFileLocation)).toBe(files["100Mb"].fileHash);
  });
});