import { createFileRoute } from '@tanstack/react-router';
import { Settings } from 'component/Settings.tsx';

export const Route = createFileRoute('/settings')({
  component: Settings,
});
