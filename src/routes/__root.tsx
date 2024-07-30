import { createRootRoute, useMatch, useMatches } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import AnimatedOutlet from 'component/AnimatedOutlet.tsx';
import { AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  // This is the top level outlet for the whole app, it can render the main editing frame as well as other components

  const matches = useMatches();
  const match = useMatch({ strict: false });
  const nextMatchIndex = matches.findIndex(d => d.id === match.id) + 1;
  const nextMatch = matches[nextMatchIndex];
  const outletRef = useRef(null);

  let RootLevelAnimationProps = {
    animate: {
      opacity: 1,
      x: 0,
    },
    initial: {
      opacity: 0,
      x: '100vw',
    },
    exit: {
      opacity: 0,
      x: '-100vw',
    },
    transition: {
      duration: 0.25,
    },
  };

  const MainFrameOverride = {
    initial: {
      opacity: 0,
      x: 0,
    },
    exit: {
      opacity: 0,
      x: 0,
    },
  };

  if (nextMatch.id === '/mainFrame') {
    RootLevelAnimationProps = Object.assign(RootLevelAnimationProps, MainFrameOverride);
  }

  return (
    <div className={'router-root h-screen w-screen overflow-hidden'}>
      <AnimatePresence mode={'popLayout'}>
        <AnimatedOutlet AnimationProps={RootLevelAnimationProps} key={nextMatch.id} ref={outletRef} />
      </AnimatePresence>
      {/*TODO: delete*/}
      <TanStackRouterDevtools />
    </div>
  );
}
