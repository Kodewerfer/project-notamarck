import { createContext, MutableRefObject } from 'react';

// pass the parent element with scroll to child, used in main frame
export const ScrollableElementContext = createContext<MutableRefObject<HTMLDivElement | null> | null>(null);