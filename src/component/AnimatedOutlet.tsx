import { ForwardedRef, forwardRef, useContext, useRef } from 'react';
import { getRouterContext, Outlet, useMatches } from '@tanstack/react-router';
import { useIsPresent } from 'framer-motion';
import { motion } from 'framer-motion';
import { cloneDeep } from 'lodash';

export type TOutletWithAnimationProps = {
  AnimationProps?: Object;
};

function OutletWithAnimation(
  { AnimationProps, ...additionalProps }: TOutletWithAnimationProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const RouterContext = getRouterContext();
  const CurrentRoutingContext = useContext(RouterContext); //@tanstack logic
  let ContextForRendering = CurrentRoutingContext;

  const activeRouteMatches = useMatches();
  const previousRouteMatches = useRef(activeRouteMatches);

  const bElementOnScreen = useIsPresent();

  const currentAnimationSettings = useRef<Object>({});

  if (AnimationProps && typeof AnimationProps === 'object') currentAnimationSettings.current = AnimationProps;

  if (bElementOnScreen) {
    previousRouteMatches.current = cloneDeep(activeRouteMatches);
  } else {
    ContextForRendering = cloneDeep(CurrentRoutingContext);
    ContextForRendering.__store.state.matches = [
      ...activeRouteMatches.map((newMatch, index) => ({
        ...(previousRouteMatches.current[index] || newMatch),
        id: newMatch.id,
      })),
      ...previousRouteMatches.current.slice(activeRouteMatches.length),
    ];
  }

  return (
    <motion.div
      className={'animated-outlet relative h-screen w-screen overflow-hidden'}
      ref={forwardedRef}
      {...additionalProps}
      {...currentAnimationSettings.current}
    >
      <RouterContext.Provider value={ContextForRendering}>
        <Outlet />
      </RouterContext.Provider>
    </motion.div>
  );
}

const AnimatedOutlet = forwardRef(OutletWithAnimation);

export default AnimatedOutlet;
