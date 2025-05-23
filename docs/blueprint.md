# **App Name**: ESP32-Connected Supplement Scheduler

## Core Features:

- **User Authentication**: Login authentication using a simple form (potentially with NextAuth.js integration in the future).
- **Schedule Management (CRUD)**:
    - Display schedules in a clear, user-friendly format (e.g., calendar or list).
    - Create new schedules via a modal form.
    - Modify existing schedules.
    - Delete schedules.
- **Supplement Management**:
    - Populate supplement selection dropdowns using API (`GET /api/supplements`).
    - (Admin) Manage the list of available supplements.
- **Dispenser Mapping**:
    - Map supplements to specific motors on the ESP32 dispenser.
    - Manage and update mappings.
- **Schedule Persistence**: Save schedules, supplement lists, and mappings to JSON files (`src/data/`).
- **ESP32 Hardware Control**:
    - Send commands to the ESP32 to dispense supplements based on the schedule (`/api/esp32/motor-command`).
    - Control ESP32's LED status (`/api/esp32/led`).
    - Potentially monitor supplement quantity via ESP32 (`/api/esp32/quantity`).

## Technology Stack:

- **Frontend**:
    - Next.js (React Framework)
    - TypeScript
    - Tailwind CSS
- **Backend**:
    - Next.js API Routes (Node.js runtime)
    - JSON files for data storage (`src/data/`)
- **Hardware**:
    - ESP32 Microcontroller

## Style Guidelines (Consistent with current project if applicable, otherwise can be refined):

- Primary color: Calming blue (#B0E2FF) for a sense of reliability. (Adjust if current project uses a different theme)
- Secondary color: Light gray (#F5F5F5) for backgrounds and subtle contrast.
- Accent: Teal (#008080) for interactive elements and highlights.
- Clean and readable sans-serif fonts.
- Simple, outline-style icons.
- Card-based layout for displaying information (schedules, mappings).
- Smooth transitions for modals and UI updates.

## Key API Endpoints (`src/app/api/`):

- **Schedules**:
    - `GET /api/schedules`: Fetch all schedules.
    - `POST /api/schedules`: Create a new schedule.
    - `GET /api/schedules/[id]`: Fetch a specific schedule by ID.
    - `PUT /api/schedules/[id]`: Update a specific schedule.
    - `DELETE /api/schedules/[id]`: Delete a specific schedule.
- **Supplements**:
    - `GET /api/supplements`: Fetch all supplements.
    - `POST /api/supplements`: Add a new supplement (admin).
- **Dispenser Mapping**:
    - `GET /api/dispenser-mapping`: Fetch current motor mappings.
    - `POST /api/dispenser-mapping`: Create or update motor mappings.
- **ESP32 Control**:
    - `POST /api/esp32/motor-command`: Send motor control commands.
    - `POST /api/esp32/led`: Control LED status.
    - `GET /api/esp32/quantity` (or `POST`): Interact with ESP32 for supplement quantity.

## Data Storage (`src/data/*.json`):

- `users.json`: Stores user credentials (for simple auth).
- `schedules.json`: Stores user-defined supplement schedules.
- `supplements.json`: Stores the list of available supplements.
- `mapping.json`: Stores the mapping between supplements and dispenser motors.
- `ledState.json`: Stores the current state of the ESP32's LED.

## Original User Request (Re-evaluated for Next.js Context):

**Original Goal:** "A customizable supplement dispenser controllable via a web interface, leveraging an Arduino (now ESP32). Users can conveniently manage their supplement intake schedules through the web."

**Web Component Development Flow (Next.js Adaptation):**

1.  **Login**:
    - User navigates to the login page (e.g., `/login` or a component on the main page).
    - Frontend (React component) handles form input.
    - On submit, a request is made to an API route like `POST /api/auth/login` (implementation can vary, e.g., simple credential check against `users.json` or NextAuth.js).
    - On success, the user is granted access to the main application features (e.g., redirected to `/` or main schedule page).
2.  **Main Schedule Display**:
    - User navigates to the main schedule page (e.g., `/`).
    - Frontend (React component like `SchedulePage.tsx`) on load/mount.
    - Makes a `GET` request to `/api/schedules` to fetch schedule data.
    - Backend (Next.js API route) reads from `schedules.json` and returns the data.
    - Frontend processes the data and renders the schedule (e.g., using components from `src/components/ui/`).
3.  **Schedule Creation/Modification**:
    - User clicks an 'Add Schedule' or 'Edit Schedule' button.
    - Frontend displays a modal (e.g., `ScheduleModal.tsx`).
    - The modal form may fetch available supplements via `GET /api/supplements` to populate a dropdown.
    - User inputs schedule details (supplement, time, quantity, etc.).
    - On 'Save', the frontend makes a `POST` (for new) or `PUT` (for existing, e.g., `/api/schedules/[id]`) request with the schedule data.
    - Backend API route saves the data to `schedules.json`.
    - Frontend updates the main schedule display upon success.
4.  **Dispenser Mapping**:
    - User navigates to a mapping page (e.g., `/mapping`).
    - Frontend (`MappingPage.tsx`) fetches current mappings via `GET /api/dispenser-mapping` and available supplements via `GET /api/supplements`.
    - User creates or modifies mappings.
    - On 'Save', frontend makes a `POST /api/dispenser-mapping` request.
    - Backend API route saves to `mapping.json`.

This revised blueprint should now better reflect the current project structure and functionalities based on the provided file list and common Next.js practices.
