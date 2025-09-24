# AI Development Rules for DataScope

This document outlines the rules and conventions for the AI assistant (Dyad) to follow when developing and modifying the DataScope application.

## Tech Stack

The application is built with the following technologies:

*   **Framework**: React 19 with TypeScript for type safety and modern features.
*   **Build Tool**: Vite for fast development and optimized builds.
*   **Styling**: Tailwind CSS for a utility-first styling approach. Configuration is managed directly in `index.html`.
*   **Data Visualization**: `recharts` is used for creating interactive charts and graphs in the dashboard.
*   **PDF Export**: `jspdf` and `html2canvas` are used together to generate PDF reports from dashboard views.
*   **State Management**: Relies on React's built-in hooks (`useState`, `useMemo`, `useCallback`) for managing component state.
*   **Component Architecture**: The application is built with custom, reusable React components located in `src/components`.
*   **Icons**: A set of custom SVG icon components is available in `src/components/icons`.

## Library and Coding Conventions

To maintain consistency and quality, the following rules must be adhered to:

1.  **Styling**:
    *   **ALWAYS** use Tailwind CSS classes for all styling.
    *   **AVOID** writing custom CSS files or using inline `style` objects.
    *   Maintain the existing color palette (`primary`, `secondary`, `background`, etc.) defined in the Tailwind config.

2.  **Components**:
    *   **ALWAYS** create new components in their own file within the `src/components/` directory.
    *   Keep components small, focused, and responsible for a single piece of functionality.
    *   Use TypeScript interfaces for component props to ensure type safety.

3.  **Icons**:
    *   **ALWAYS** use the existing icon components from `src/components/icons/`.
    *   If a new icon is needed, create a new, separate component for it in the `src/components/icons/` directory, following the existing pattern.

4.  **Data Visualization**:
    *   For any charts, graphs, or data visualizations, **MUST** use the `recharts` library.
    *   Ensure charts are responsive by wrapping them in `ResponsiveContainer`.

5.  **State Management**:
    *   Use React's built-in hooks (`useState`, `useCallback`, `useMemo`, `useEffect`) for all state management.
    *   **DO NOT** introduce external state management libraries like Redux or Zustand unless explicitly instructed by the user.

6.  **Dependencies**:
    *   **DO NOT** add new third-party packages or libraries without a clear reason and explicit user consent. The goal is to keep the application lightweight.

7.  **Code Structure**:
    *   Follow the existing file structure (e.g., types in `types.ts`, mock data in `data/mockData.ts`).
    *   Keep the main application logic and view routing within `App.tsx`.