import { type StorageData, StorageKeys } from '../definitions/storage-definitions.ts';

export class StorageService {
  // Method to set data
  async setData<T extends StorageKeys>(key: T, value: StorageData[T]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Method to get data
  async getData<T extends StorageKeys>(key: T): Promise<StorageData[T] | undefined> {
    return await new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] as StorageData[T]);
        }
      });
    });
  }

  // Method to listen for changes
  listenData(callback: (changes: Partial<StorageData>, areaName: string) => void): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      const relevantChanges: Partial<StorageData> = {};
      Object.keys(changes).forEach((key) => {
        if (Object.values(StorageKeys).includes(key as StorageKeys)) {
          relevantChanges[key as StorageKeys] = changes[key].newValue;
        }
      });

      if (Object.keys(relevantChanges).length > 0) {
        callback(relevantChanges, namespace);
      }
    });
  }
}

// Export a singleton instance of StorageService
export const storageService = new StorageService();
