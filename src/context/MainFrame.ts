import { createContext, MutableRefObject } from 'react';

// pass the parent element with scroll to child, used in main frame
const MainFrameContext = createContext<MutableRefObject<HTMLDivElement | null> | null>(null);

export default MainFrameContext;
