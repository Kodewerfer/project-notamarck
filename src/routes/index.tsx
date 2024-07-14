import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: EmptyEditor,
});

function EmptyEditor() {
  // Index for the whole app
  return (
    <>
      {/* TODO: Default to editing frame for now */}
      <Navigate to={'/mainFrame'} replace={true} />
      <div>APP Index</div>
    </>
  );
}
