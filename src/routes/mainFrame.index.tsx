import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/mainFrame/')({
  component: () => {
    return (
      <>
        {/*simple redirect for now*/}
        <Navigate to={'/mainFrame/edit'} />
      </>
    );
  },
});
