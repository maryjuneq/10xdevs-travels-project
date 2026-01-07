# Product Requirements Document (PRD) - VibeTravels

## 1. Product Overview
VibeTravels is a web-based application that converts simple travel notes into actionable, day-level trip itineraries using an external AI service. The MVP targets individuals planning trips for a couple or a small group of friends. The system offers note taking, preference management, manual AI-powered plan generation.

## 2. User Problem
Planning engaging trips requires time, research, and organization. Travellers often jot scattered notes about destinations, dates, budgets, and group details but struggle to convert them into coherent plans. VibeTravels streamlines this process by transforming these raw notes into structured itineraries while respecting individual travel preferences.

## 3. Functional Requirements
FR-001  User registration and login via username/password (Supabase Auth)
FR-002  Create, read, update, delete (CRUD) trip notes capturing destination, approximate start date, trip length, budget, details and group size
FR-003  Store and edit user travel preferences in a private profile
FR-004  Trigger AI generation of a day-level itinerary from a selected note based on stored user preferences
FR-005  Display progress feedback during AI generation (≤ 1 min SLA)
FR-006  Persist generated itinerary linked to its original note; allow user edits; allow regeneration
FR-007  Handle generation failures by displaying error and enabling retry; if a previously generated plan exists, show that plan
FR-008  Allow users to delete their account, cascading removal of notes, plans, and preferences

## 4. Product Boundaries
PB-001  No sharing of notes or plans between accounts in MVP
PB-002  No multimedia upload, display, or analysis
PB-003  No advanced scheduling (hour-by-hour) or logistics optimization
PB-004  No content moderation or safety filters in MVP (profiles are private)
PB-005  No version history for multiple plan generations; only the latest plan is stored
PB-006  No in-app user feedback collection beyond manual plan edits

## 5. User Stories
| ID | Title | Description | Acceptance Criteria |
|----|-------|-------------|---------------------|
| US-001 | User registration | As a first-time visitor, I want to create an account with email and password so that I can save notes and plans. | 1) Email, password, and confirmation fields are validated. 2) Account is created in Supabase. 3) User is redirected to dashboard and logged in. |
| US-002 | User login | As a returning user, I want to log in with my credentials so I can access my data. | 1) Valid credentials grant access and start a session. 2) Invalid credentials return an error without revealing whether the email exists. |
| US-003 | Create trip note | As a logged-in user, I want to create a trip note with destination, start date, length, budget, details and group size so I can plan a future trip. | 1) All mandatory fields are validated. 2) Note is stored in the database and appears in notes list. |
| US-004 | View notes list | As a user, I want to browse my saved notes so I can choose one to edit or generate a plan from. | 1) Notes list displays all notes belonging to the user. 2) Each list item shows destination and start date. |
| US-005 | Edit trip note | As a user, I want to modify an existing note so that details stay accurate. | 1) Form pre-populates with current data. 2) Changes are saved and reflected in list. |
| US-006 | Delete trip note | As a user, I want to remove a note I no longer need. | 1) Deletion requires confirmation. 2) Note and any linked plan are deleted from DB. |
| US-007 | Manage preferences | As a user, I want to add or edit at least one travel preference to personalize plan generation. | 1) Preference form submits successfully. 2) DB records at least one preference per user to count toward KPI. |
| US-008 | Generate itinerary | As a user, I want to generate a travel plan from a note so that I receive a day-level itinerary. | 1) User clicks "Generate Plan". 2) Progress text displays. 3) Plan is returned within 60 s and stored. 4) Itinerary shows day-level outline. |
| US-009 | Handle generation failure | As a user, I want to retry plan generation if it fails so that I can still obtain an itinerary. | 1) On failure, user returns to note page. 2) If prior plan exists, it is displayed. 3) Retry button triggers another request. |
| US-010 | View & edit itinerary | As a user, I want to view the generated itinerary and make manual edits. | 1) Itinerary page loads from DB. 2) User can update text fields. 3) Changes are saved. |
| US-011 | Account deletion | As a user, I want to delete my account and all data. | 1) Deletion requires confirmation. 2) Notes, plans, preferences, and auth record are removed. 3) User session ends. |
| US-013 | Secure session handling | As the system, I need to ensure that only authenticated users can access their own notes, plans, and preferences. | 1) All protected routes check for valid session. 2) Unauthorized access redirects to login. 3) Users cannot access another user's resources. |

## 6. Success Metrics
SM-001  Profile Completion Rate: ≥ 90 % of active users have at least one preference saved, measured via SQL query.
SM-002  Plan Generation Engagement: ≥ 75 % of users generate two or more itineraries per calendar year, measured via SQL query.

