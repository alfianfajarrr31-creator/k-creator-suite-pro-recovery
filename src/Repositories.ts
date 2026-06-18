export const dbContainer: { db: IDBDatabase | null } = {
    db: null
};

export class BaseRepository {
    storeName: string;
    constructor(storeName: string) {
        this.storeName = storeName;
    }

    get(id: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    getAll(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    put(item: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            tx.oncomplete = () => resolve(item);
            tx.onerror = (e: any) => reject(e.target.error || tx.error);
            tx.onabort = () => reject(new Error("Transaction aborted"));
            
            store.put(item);
        });
    }

    delete(id: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            tx.oncomplete = () => resolve();
            tx.onerror = (e: any) => reject(e.target.error || tx.error);
            tx.onabort = () => reject(new Error("Transaction aborted"));
            
            store.delete(id);
        });
    }

    clear(): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            tx.oncomplete = () => resolve();
            tx.onerror = (e: any) => reject(e.target.error || tx.error);
            
            store.clear();
        });
    }
}

export const ProjectRepo = new BaseRepository('projects');
export const CharacterRepo = new BaseRepository('characters');
export const VoiceRepo = new BaseRepository('voice_assets');

export const SettingsRepo = {
    get(key: string): Promise<any> {
        return new Promise((resolve) => {
            const db = dbContainer.db;
            if (!db) return resolve(null);
            const tx = db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => resolve(null);
        });
    },
    put(key: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = dbContainer.db;
            if (!db) return reject(new Error("Database not initialized"));
            const tx = db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            
            tx.oncomplete = () => resolve();
            tx.onerror = (e: any) => reject(e.target.error || tx.error);
            
            store.put({ key, value, updated_at: new Date() });
        });
    }
};
