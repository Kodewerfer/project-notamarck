import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: EmptyEditor,
});

function EmptyEditor() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: '/edit/' });
  }, []);

  return (
    <>
      <div> Index</div>
    </>
  );
}
