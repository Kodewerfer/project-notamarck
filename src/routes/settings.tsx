import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

function Settings() {
  return (
    <>
      <div className={'grid h-full w-full content-center justify-center bg-slate-800/75'}>
        <div className={'h-20 w-20 bg-blue-500'}>Setting inner</div>
      </div>
    </>
  );
}
