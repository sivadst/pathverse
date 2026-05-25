# PathVerse API

All APIs return JSON and are designed to be replaceable with hosted model calls when `NEXT_PUBLIC_AI_MODE` changes from `local`.

## `POST /api/ai/mentor`

Request:

```json
{ "prompt": "Build my roadmap" }
```

Response:

```json
{
  "answer": "Your next roadmap should focus on LLM Systems...",
  "generatedAt": "2026-05-25T00:00:00.000Z"
}
```

## `POST /api/ai/roadmap`

Request:

```json
{ "track": "ai-product-architect" }
```

Response contains generated milestones with week, title, outcome, focus tags, and intensity.

## `POST /api/resume/analyze`

Request:

```json
{ "resumeText": "Architected an AI dashboard..." }
```

Response:

```json
{
  "atsScore": 86,
  "strengths": [],
  "risks": [],
  "rewritePlan": []
}
```
