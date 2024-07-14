import { forwardRef, useContext, useRef } from 'react';
import { getRouterContext, Outlet } from '@tanstack/react-router';
import { useIsPresent } from 'framer-motion';
import { motion } from 'framer-motion';
import { cloneDeep } from 'lodash';

const AnimatedOutlet = forwardRef<HTMLDivElement>((_, ref) => {
  const RouterContext = getRouterContext();

  const routerContext = useContext(RouterContext);

  const renderedContext = useRef(routerContext);

  const isPresent = useIsPresent();

  if (isPresent) {
    renderedContext.current = cloneDeep(routerContext);
  }

  return (
    <motion.div
      ref={ref}
      animate={{ opacity: 1, y: 0, left: 0 }}
      initial={{ opacity: 0, y: 20 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.15 }}
    >
      <RouterContext.Provider value={renderedContext.current}>
        <Outlet />
      </RouterContext.Provider>
    </motion.div>
  );
});

export default AnimatedOutlet;
