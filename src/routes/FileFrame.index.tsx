import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/FileFrame/')({
  component: () => {
    return (
      <>
        {/*simple redirect for now*/}
        <Navigate to={'/FileFrame/edit'} />
      </>
    );
  },
});
