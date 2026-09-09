export type MemoryType = 'fact' | 'emotional_state' | 'preference';

export interface MemoryItem {
  memory_type: MemoryType;
  content: string;
}

export interface StoredMemoryRecord {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: string;
  extractedMemories?: MemoryItem[];
  retrievedMemoriesCount?: number;
}

export type TabType = 'simulator' | 'code' | 'schema' | 'docs';
