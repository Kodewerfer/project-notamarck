import { createRootRoute, Outlet, useMatch, useMatches } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import AnimatedOutlet from 'component/AnimatedOutlet.tsx';
import { AnimatePresence } from 'framer-motion';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  // This is the top level outlet for the whole app, it can render the main editing frame as well as other components

  const matches = useMatches();
  const match = useMatch({ strict: false });
  const nextMatchIndex = matches.findIndex(d => d.id === match.id) + 1;
  const nextMatch = matches[nextMatchIndex];

  return (
    <>
      <AnimatePresence>
        <AnimatedOutlet key={nextMatch.id} />
      </AnimatePresence>
      {/*TODO: delete*/}
      <TanStackRouterDevtools />
    </>
  );
}
