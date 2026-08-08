# Graph Report - .  (2026-08-06)

## Corpus Check
- Corpus is ~23,037 words - fits in a single context window. You may not need a graph.

## Summary
- 587 nodes · 1201 edges · 38 communities (30 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.73)
- Token cost: 134,914 input · 0 output

## Community Hubs (Navigation)
- Repository Layer (Data Access)
- Service Layer (Business Logic)
- Backend Dependencies
- Frontend Dependencies
- App Bootstrap and Infra Config
- Auth Middleware and Routes
- DB Migration Runner and Test Suite
- Admin Dashboard Pages
- Public Site Pages and API Client
- Admin Shared Form Components
- Auth UI (Login Modal and Navbar)
- Upload and User Controllers
- Auth Controller and Validation
- Signal Controller and Validation
- Gallery Controller and Validation
- Project Docs and Build Tooling
- Frontend API Client Core
- Cart UI and Context
- Signal Terminal UI
- About and Dashboard Controllers
- Event Controller and Validation
- Order Controller and Validation
- Product Controller and Validation
- Oxlint Config
- Cart Controller and Validation
- Footer and Logo Components
- Users and Refresh Tokens Schema
- Cart Schema
- Orders Schema
- Password Reset Schema
- Products Schema
- Gallery Schema
- About Schema
- Events Schema
- Signals Schema
- Signal Type Migration
- Favicon Asset

## God Nodes (most connected - your core abstractions)
1. `query()` - 62 edges
2. `ok()` - 61 edges
3. `react` - 25 edges
4. `AppError` - 17 edges
5. `useAuth()` - 15 edges
6. `jsonHeaders()` - 15 edges
7. `registerAndLogin()` - 14 edges
8. `registerAdmin()` - 14 edges
9. `env` - 13 edges
10. `stopServer()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `stopServer()` --indirect_call--> `resolve()`  [INFERRED]
  test/helpers.js → src/controllers/signalController.js
- `SIGNAL33 (Project)` --conceptually_related_to--> `React + Vite Template (frontend)`  [INFERRED]
  README.md → frontend/README.md
- `bcrypt allowBuilds config` --conceptually_related_to--> `React + Vite Template (frontend)`  [INFERRED]
  pnpm-workspace.yaml → frontend/README.md
- `SIGNAL33 App Shell (index.html)` --conceptually_related_to--> `SIGNAL33 (Project)`  [INFERRED]
  frontend/index.html → README.md
- `getOne()` --calls--> `ok()`  [EXTRACTED]
  src/controllers/aboutController.js → src/utils/response.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Vite build tooling options for SIGNAL33 frontend** — frontend_readme_vitejs_plugin_react, frontend_readme_vitejs_plugin_react_swc, frontend_readme_oxc, frontend_readme_swc, frontend_readme_react_compiler, frontend_readme_oxlint [INFERRED 0.75]
- **SIGNAL33 monorepo components** — readme_signal33, frontend_readme_react_vite_template, pnpm_workspace_bcrypt_allowbuild [INFERRED 0.65]

## Communities (38 total, 8 thin omitted)

### Community 0 - "Repository Layer (Data Access)"
Cohesion: 0.06
Nodes (54): query(), withTransaction(), getAbout(), updateAbout(), addItem(), findItem(), findOrCreateByUserId(), getItemsWithProduct() (+46 more)

### Community 1 - "Service Layer (Business Logic)"
Cohesion: 0.05
Nodes (19): corsOptions, addItem(), getCart(), removeItem(), toCartView(), updateItemQuantity(), listItems(), reorderItems() (+11 more)

### Community 2 - "Backend Dependencies"
Cohesion: 0.05
Nodes (39): bcrypt, cors, dotenv, express, express-rate-limit, helmet, jsonwebtoken, multer (+31 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (39): @fontsource/archivo, @fontsource/jetbrains-mono, dependencies, @fontsource/archivo, @fontsource/jetbrains-mono, motion, @phosphor-icons/react, react (+31 more)

### Community 4 - "App Bootstrap and Infra Config"
Cohesion: 0.12
Nodes (23): app, uploadsDir, resend, env, logger, errorHandler(), apiLimiter, routes (+15 more)

### Community 5 - "Auth Middleware and Routes"
Cohesion: 0.14
Nodes (19): authenticate(), authorize(), optionalAuthenticate(), authLimiter, signalLimiter, EXTENSION_BY_MIME, MAGIC_BYTES_MATCH, upload (+11 more)

### Community 6 - "DB Migration Runner and Test Suite"
Cohesion: 0.29
Nodes (15): migrationsDir, pool, authHeader(), closePool(), deleteUsersByEmail(), jsonHeaders(), login(), promoteToAdmin() (+7 more)

### Community 7 - "Admin Dashboard Pages"
Cohesion: 0.14
Nodes (14): ordersApi, usersApi, AdminLayout(), SECTIONS, AdminEvents(), AdminGallery(), AdminOrders(), STATUS_LABEL (+6 more)

### Community 8 - "Public Site Pages and API Client"
Cohesion: 0.14
Nodes (9): aboutApi, eventsApi, galleryApi, productsApi, uploadsApi, AdminAbout(), Home(), Store() (+1 more)

### Community 9 - "Admin Shared Form Components"
Cohesion: 0.24
Nodes (9): ImageUploadField(), Modal(), Field(), EMPTY_FORM, EMPTY_FORM, EMPTY_FORM, AdminSignals(), EMPTY_FORM (+1 more)

### Community 10 - "Auth UI (Login Modal and Navbar)"
Cohesion: 0.19
Nodes (8): authApi, LoginModal(), TABS, LINKS, Navbar(), UserMenu(), ProtectedRoute(), useAuth()

### Community 11 - "Upload and User Controllers"
Cohesion: 0.23
Nodes (13): list(), remove(), upload(), changeMyPassword(), deleteUser(), getMe(), getUserById(), listUsers() (+5 more)

### Community 12 - "Auth Controller and Validation"
Cohesion: 0.20
Nodes (12): forgotPassword(), login(), logout(), me(), refresh(), register(), resetPassword(), forgotPasswordSchema (+4 more)

### Community 13 - "Signal Controller and Validation"
Cohesion: 0.18
Nodes (12): create(), list(), remove(), resolve(), update(), commandField, createSignalSchema, effectPayloadSchema (+4 more)

### Community 14 - "Gallery Controller and Validation"
Cohesion: 0.23
Nodes (11): canSeeInactive(), create(), getOne(), list(), remove(), reorder(), update(), createGallerySchema (+3 more)

### Community 15 - "Project Docs and Build Tooling"
Cohesion: 0.20
Nodes (11): SIGNAL33 App Shell (index.html), Oxc, Oxlint, React Compiler, React + Vite Template (frontend), SWC, Vite React-TS Template, @vitejs/plugin-react (+3 more)

### Community 16 - "Frontend API Client Core"
Cohesion: 0.29
Nodes (8): ApiError, apiRequest(), getAccessToken(), refreshAccessToken(), setTokens(), saveTokens(), AuthContext, AuthProvider()

### Community 17 - "Cart UI and Context"
Cohesion: 0.27
Nodes (7): cartApi, App(), CartDrawer(), CartContext, CartProvider(), useCart(), ProductDetail()

### Community 18 - "Signal Terminal UI"
Cohesion: 0.22
Nodes (8): dashboardApi, signalApi, DISCO_COLORS, SignalEffectOverlay(), Dashboard(), METRICS, Signal(), react

### Community 19 - "About and Dashboard Controllers"
Cohesion: 0.24
Nodes (6): getOne(), update(), getSummary(), notFound(), fail(), updateAboutSchema

### Community 20 - "Event Controller and Validation"
Cohesion: 0.27
Nodes (9): canSeeInactive(), create(), getOne(), list(), remove(), update(), createEventSchema, listEventsQuerySchema (+1 more)

### Community 21 - "Order Controller and Validation"
Cohesion: 0.24
Nodes (9): create(), getOne(), listAll(), listMine(), updateStatus(), listAllOrdersQuerySchema, listOrdersQuerySchema, ORDER_STATUSES (+1 more)

### Community 22 - "Product Controller and Validation"
Cohesion: 0.27
Nodes (9): canSeeInactive(), create(), getOne(), list(), remove(), update(), createProductSchema, listProductsQuerySchema (+1 more)

### Community 23 - "Oxlint Config"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 24 - "Cart Controller and Validation"
Cohesion: 0.32
Nodes (6): addItem(), getCart(), removeItem(), updateItem(), addItemSchema, updateItemSchema

### Community 25 - "Footer and Logo Components"
Cohesion: 0.40
Nodes (4): Footer(), TODO: reemplazar "#" por los perfiles reales una vez estén disponibles., SOCIALS, Logo()

### Community 26 - "Users and Refresh Tokens Schema"
Cohesion: 0.53
Nodes (5): refresh_tokens, refresh_tokens_set_updated_at, set_updated_at(), users, users_set_updated_at

### Community 27 - "Cart Schema"
Cohesion: 0.50
Nodes (4): cart_items, cart_items_set_updated_at, carts, carts_set_updated_at

### Community 28 - "Orders Schema"
Cohesion: 0.50
Nodes (4): order_items, order_items_set_updated_at, orders, orders_set_updated_at

## Knowledge Gaps
- **97 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ok()` connect `Upload and User Controllers` to `Auth Controller and Validation`, `Signal Controller and Validation`, `Gallery Controller and Validation`, `About and Dashboard Controllers`, `Event Controller and Validation`, `Order Controller and Validation`, `Product Controller and Validation`, `Cart Controller and Validation`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `AppError` connect `Service Layer (Business Logic)` to `Repository Layer (Data Access)`, `Upload and User Controllers`, `App Bootstrap and Infra Config`, `Auth Middleware and Routes`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Repository Layer (Data Access)` be split into smaller, more focused modules?**
  _Cohesion score 0.05593561368209256 - nodes in this community are weakly interconnected._
- **Should `Service Layer (Business Logic)` be split into smaller, more focused modules?**
  _Cohesion score 0.05012531328320802 - nodes in this community are weakly interconnected._
- **Should `Backend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._