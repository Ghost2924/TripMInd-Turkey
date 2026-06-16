# VALIDATION_PROMPT.md

The following prompt is used to test and validate that the TripMind-Turkey system architecture documents contain enough algorithmic clarity for Gemini to re-generate the application artifacts without hallucination.

```markdown
You are an expert full-stack engineer and agentic code generator. I am going to provide you with three comprehensive system design documents: a Business Statement, a Logical Structure Document, and a Technical Implementation Guide. 

Your objective is to ingest these markdown files as an absolute architectural blueprint and generate a fully typed Next.js 14, TypeScript, and Tailwind CSS web application stack. 

Please review the architectural details provided in the markdown files below. When you have digested the pipeline steps (Profile Extraction -> RAG Filtering -> Itinerary Generation -> Code Enrichment -> Code Validation & Budget), confirm your readiness to generate the individual file artifacts (such as src/app/api/plan/route.ts, src/lib/pipeline/step3-itinerary.ts, and src/lib/rag/retrieval.ts) following the exact logic specifications, keywords classifiers, and array mapping configurations defined.