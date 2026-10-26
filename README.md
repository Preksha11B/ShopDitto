# AI Shopping OS / ShopDitto

AI Shopping OS is a memory-augmented, multi-agent shopping intelligence platform built on Next.js and Prisma. It acts as an intelligent shopping layer above existing marketplaces instead of being a traditional storefront. The system helps users discover products, compare alternatives, understand product fit, save wishlist items, monitor price trends, and receive personalized shopping guidance.

This repository implements the concept described in the project documentation: a personal shopping assistant combining conversational AI, recommendation ranking, digital twin modeling, memory retention, and explainable decision support.

## Project Purpose

Most shopping apps are optimized for catalog browsing and transactions, but they do not usually:

- remember user preferences across sessions
- explain why a recommendation was shown
- reason about budget fit or buying timing
- compare multiple platforms cleanly
- adapt to user behavior over time

ShopDitto solves this by acting as a personalized shopping intelligence layer. It tracks user preferences, adapts over time, explains recommendations, and supports buying decisions with richer context.

## Problem Statement

The project addresses the common problems in online shopping experiences:

- decision fatigue when comparing products across stores
- generic recommendations without personalization
- missing explanation behind product suggestions
- forgetfulness of prior preferences and categories
- inability to judge whether a product is a good buy at the current moment
- lack of adaptive shopping strategy based on user behavior

## Core Product Ideas

The system is centered around four main concepts:

1. MARE (Memory-Augmented Recommendation Engine)
   - ranks products based on personalized shopping signals
2. AHDE (Adaptive Hybrid Decision Engine)
   - selects the right agents and model tiers for each request
3. DPT -> DToC (Digital Persona Twin to Digital Twin of the Customer)
   - builds a user profile and evolves it over time
4. Multi-Agent Shopping OS
   - coordinates specialized agents for intent, search, memory, recommendation, explainability, price, and more

## Product Scope

The system includes the following capabilities:

- AI shopping assistant chat
- product search and discovery
- cross-platform comparison
- recommendation ranking and scoring
- user memory and long-term preference tracking
- digital twin representation and evolution
- price prediction, buy/wait guidance, and wishlist alerts
- insights dashboard and activity timeline
- privacy controls for memory/export/reset

The project is not a payment platform and does not directly handle checkout or e-commerce transactions.

## High-Level Architecture

The application follows a layered architecture:

- Presentation layer: Next.js + React + Tailwind + shadcn/ui
- App/API layer: route handlers in the App Router
- Intelligence layer: agents, scoring, memory, and twin logic
- Data layer: Prisma + SQLite
- External services: LLM SDK and mock catalog/price data

Core design principle:

- the browser never directly calls the LLM
- all AI orchestration happens on the server side

## Technology Stack

- Framework: Next.js 16
- Language: TypeScript
- UI: React 19, Tailwind CSS, shadcn/ui, Radix UI, Lucide
- State: Zustand, TanStack React Query
- Database: Prisma + SQLite
- AI: z-ai-web-dev-sdk
- Validation: Zod, React Hook Form
- Charts/UX: Recharts, Framer Motion, Sonner, date-fns
- Testing: Node.js test runner

## Functional Requirements Summary

The system shall support the following functional requirements:

- FR-01: Allow onboarding to capture shopping preferences and budget constraints
- FR-02: Create an initial digital twin from onboarding responses
- FR-03: Start with basic memory state for long-term user preferences
- FR-04: Accept shopping-related natural-language queries
- FR-05: Resolve conversational references like “it”, “this”, and “that”
- FR-06: Detect shopping intent, category, platform, and budget needs
- FR-07: Select the minimal set of agents necessary for a request
- FR-08: Return personalized recommendations with explanations
- FR-09: Search and browse a product catalog using category, filters, and sort criteria
- FR-10: Compare products across multiple platforms and price points
- FR-11: Rank products using a shopping score based on preference, price, review, memory, spec fit, and availability
- FR-12: Persist chat history, recommendations, and timeline events
- FR-13: Support user memory management, including add, edit, delete, export, and reset
- FR-14: Support digital twin evolution based on interactions and shopping behavior
- FR-15: Allow wishlist creation and target-price tracking
- FR-16: Provide price-trend analysis and buy/wait/neutral guidance
- FR-17: Notify users when a product reaches a target price or sale level
- FR-18: Provide insights dashboards with category, brand, and platform analytics
- FR-19: Allow privacy controls and export/reset of user-scoped data

## Non-Functional Requirements Summary

- Performance: simple shopping queries should be answered quickly without unnecessary full-agent orchestration
- Reliability: the app should continue operating with degraded AI service availability and fallback logic
- Security and privacy: AI calls stay server-side; user data should remain controllable and exportable
- Usability: desktop and mobile interfaces should be intuitive and clear
- Maintainability: architecture should separate frontend, backend, business logic, and data access
- Scalability: the system should be extendable to larger catalogs and more external providers

## User Roles and Personas

- Casual shopper: needs product discovery and simple recommendations
- Price-sensitive shopper: wants deals, price history, and buy timing guidance
- Technical shopper: values specs, reviews, and comparison depth
- Fashion/beauty shopper: values styling, reviews, and brand fit
- Returning shopper: benefits from memory continuity and personalized suggestions
- Privacy-conscious shopper: needs memory visibility and control

## Use Cases

### 1. New User Onboarding
A new user opens the app, completes onboarding, defines budget and preferences, and receives an initial persona and memory state.

### 2. Product Recommendation
A user asks for a product suggestion. The system detects intent, loads memory and digital twin state, ranks candidates, and returns recommendations with explanation.

### 3. Product Comparison
A user compares multiple products. The system surfaces price, rating, features, and a comparison verdict.

### 4. Price Monitoring
A user asks whether to buy now or wait. The system evaluates price history, asks budget constraints, and gives a buy/wait recommendation.

### 5. Memory and Twin Review
A user inspects their memory and digital twin. They can edit, delete, reset, or disable personalization features.

## Data and Domain Model

The repository uses a domain model built around these main entities:

- User
- Memory
- Product
- PlatformPrice
- PriceHistory
- ChatMessage
- Recommendation
- WishlistItem
- TimelineEvent
- Notification
- ConnectedAccount

The seeded catalog contains demo products across categories such as laptops, phones, earbuds, TVs, watches, cameras, home goods, fashion, beauty, and appliances.

## Product Experience

The interface is organized around a single landing page and multiple views, including:

- onboarding
- chat
- discover
- wishlist
- memory dashboard
- digital twin dashboard
- insights
- timeline
- sales calendar
- settings

The app is responsive and supports both desktop and mobile workflows.

## Privacy and Safety

Important safety and privacy principles in this project:

- browser never calls the LLM directly
- AI orchestration remains on the server side
- users can edit, export, or reset memory and digital twin data
- platform connections are informational/demo flags, not full production OAuth flows
- purchase actions are not executed automatically without user confirmation

## Current Repository Structure

```text
.
├── src/
├── prisma/
├── public/
├── backend/
├── frontend/
├── tests/
├── .zscripts/
├── AGENTS.md
├── PROJECT.md
├── README.md
├── DOCUMENTATION.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── Caddyfile
├── worklog.md
└── ...
```

## Local Setup

### Prerequisites

- Node.js and npm (or Bun)
- SQLite-compatible environment
- optional Python for packaged runtime workflows

### Install

```bash
npm install
```

### Initialize the database

```bash
npx prisma db push
```

Optional seed:

```bash
npx prisma db seed
```

### Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build and Production

```bash
npm run build
npm run start
```

## Risks and Constraints

- catalog and pricing are demo/mock-based in the current implementation
- live marketplace scraping is not a required production feature here
- one-demo-user model limits scaling for multi-user production use
- the app is designed for research and prototype-level validation rather than full enterprise deployment

## Future Scope

Planned enhancements include:

- real marketplace integrations
- production-grade authentication and user management
- more advanced model evaluation and A/B testing
- push notifications and email alerts
- deeper RAG and semantic retrieval
- live price feeds and stronger comparison logic
- broader product catalog and category support

## Acceptance Criteria

This project is considered successful when:

- a user can onboard and set shopping preferences
- the assistant can answer shopping queries with contextual recommendations
- recommendations are personalized based on memory and twin state
- products can be compared and saved to a wishlist
- price history and buy timing guidance are clear and useful
- the user can inspect and manage memory and privacy settings
- the system remains usable even when AI services are partially unavailable

## Summary

ShopDitto is a shopping intelligence platform designed to help users make smarter purchase decisions with the support of AI, memory, and digital twin-based personalization. It combines product discovery, recommendation ranking, price intelligence, and explainability into a single conversational shopping OS.

This README provides the current overview and SRS-oriented summary of the system. For the more exhaustive project design and product narrative, see:

- PROJECT.md
- DOCUMENTATION.md
- AGENT_DATASETS.md
- AGENT_DATASET_MATRIX.md
- worklog.md

## License and Repository

Repository: https://github.com/Preksha11B/ShopDitto

This project is intended for research, product exploration, and demonstration of AI-powered shopping assistance.
