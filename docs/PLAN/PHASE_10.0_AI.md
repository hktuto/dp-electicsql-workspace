# Phase 10.0: AI Integration

## Goals

- AI-powered column suggestions
- Natural language queries
- Content generation

---

## Tasks

- [ ] Setup OpenAI/Ollama integration
- [ ] Implement column type suggestions
- [ ] Implement natural language to filter conversion
- [ ] Implement content generation for text fields
- [ ] Create AI assistant UI

---

## Features

### Column Type Suggestions

Given sample data, AI suggests:
- Appropriate column types
- Validation rules
- Default values

### Natural Language Queries

Convert plain English to filter conditions:
- "Show me all tasks due this week" → date filter
- "Find customers from California" → text filter
- "Items with price over $100" → number filter

### Content Generation

- Generate descriptions
- Summarize records
- Extract entities from text
- Translate content

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/suggest-columns` | Suggest column types from data |
| POST | `/api/ai/parse-query` | Convert natural language to filters |
| POST | `/api/ai/generate` | Generate content |
| POST | `/api/ai/summarize` | Summarize records |

---

## Configuration

```typescript
// server/utils/ai.ts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Optional: Ollama for self-hosted
const ollama = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
}
```

---

## Frontend Components

| Component | Description |
|-----------|-------------|
| `AIAssistant.vue` | Floating AI chat panel |
| `ColumnSuggester.vue` | Column type suggestion dialog |
| `QueryBar.vue` | Natural language query input |

---

## Completion Criteria

- [ ] AI can suggest column types
- [ ] Natural language queries work
- [ ] Content generation available
- [ ] Works with OpenAI and Ollama

