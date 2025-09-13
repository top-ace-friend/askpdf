/**
 * IndexedDB-based file storage for PDF files
 * Provides a simple interface to store and retrieve large files locally
 */

interface FileRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  data: ArrayBuffer;
}

class FileStorage {
  private dbName = "askpdf-files";
  private dbVersion = 1;
  private storeName = "files";
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("fileName", "fileName", { unique: false });
        }
      };
    });
  }

  async storeFile(fileId: string, file: File): Promise<void> {
    const db = await this.openDB();
    const arrayBuffer = await file.arrayBuffer();

    const fileRecord: FileRecord = {
      id: fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
      data: arrayBuffer,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(fileRecord);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getFile(fileId: string): Promise<File | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as FileRecord;
        if (!result) {
          resolve(null);
          return;
        }

        // Convert ArrayBuffer back to File
        const file = new File([result.data], result.fileName, {
          type: result.fileType,
        });
        resolve(file);
      };
    });
  }

  async getFileBlob(fileId: string): Promise<Blob | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as FileRecord;
        if (!result) {
          resolve(null);
          return;
        }

        // Convert ArrayBuffer to Blob
        const blob = new Blob([result.data], { type: result.fileType });
        resolve(blob);
      };
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async listFiles(): Promise<
    { id: string; fileName: string; fileSize: number; createdAt: string }[]
  > {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const files = request.result.map((record: FileRecord) => ({
          id: record.id,
          fileName: record.fileName,
          fileSize: record.fileSize,
          createdAt: record.createdAt,
        }));
        resolve(files);
      };
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Export singleton instance
export const fileStorage = new FileStorage();
