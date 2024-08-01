import { createRootRoute, Link, useMatch, useMatches } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import AnimatedOutlet from 'component/AnimatedOutlet.tsx';
import { AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { ArchiveBoxIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

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

  if (nextMatch.id === '/FileFrame') {
    RootLevelAnimationProps = Object.assign(RootLevelAnimationProps, MainFrameOverride);
  }

  return (
    <div className={'router-root h-screen w-screen overflow-hidden'}>
      {/*side buttons*/}
      <aside className={'fixed left-0 top-0 z-50 h-full w-14 bg-gray-50 dark:bg-gray-900'}>
        {/*side buttons*/}
        <ul className="relative flex h-full w-14 flex-col align-middle">
          <li className="is-active group mb-1 flex justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="block grow pl-1.5" to="/FileFrame/edit">
              {/* mind the group-[.is-active] */}
              <ArchiveBoxIcon className="size-8 group-hover:size-10 group-[.is-active]:size-10" />
            </Link>
          </li>
          {/*the "setting button"*/}
          <li className="group absolute bottom-0 left-0 flex w-full justify-center py-4 font-semibold dark:text-blue-50">
            <Link className="block grow pl-1.5" to="/settings">
              <Cog6ToothIcon className={'size-8 group-hover:size-10'} />
            </Link>
          </li>
        </ul>
      </aside>

      <AnimatePresence mode={'popLayout'}>
        <AnimatedOutlet
          AnimationProps={RootLevelAnimationProps}
          AdditionalClassName={'ml-14 overflow-hidden h-screen'}
          key={nextMatch.id}
          ref={outletRef}
        />
      </AnimatePresence>
      {/*TODO: delete*/}
      <TanStackRouterDevtools />
    </div>
  );
}
