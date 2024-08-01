import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: EmptyEditor,
});

function EmptyEditor() {
  // Index for the whole app
  return (
    <>
      {/* TODO: Default to editing frame for now, add a proper index page later */}
      <Navigate to={'/FileFrame'} replace={true} />
      <div>APP Index</div>
    </>
  );
}
